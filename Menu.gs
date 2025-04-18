function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("📦 Main Noire - Gestion")
    .addItem("🔄 Générer les boutons", "generateButtons")
    .addItem("🕵️ Voir l'historique", "openHistorique")
    .addItem("📋 Ouvrir le panneau", "openStats")
    .addToUi();
}

function generateButtons() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inventaire");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    sheet.getRange(i + 1, 4).setValue("➕");
    sheet.getRange(i + 1, 5).setValue("➖");
  }
}

function incrementStock(row, value) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inventaire");
  const quantityCell = sheet.getRange(row, 3);
  const current = parseInt(quantityCell.getValue()) || 0;
  const updated = current + value;
  quantityCell.setValue(updated);

  const histo = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Historique");
  const produit = sheet.getRange(row, 2).getValue();
  const date = new Date();
  const user = Session.getActiveUser().getEmail();
  histo.appendRow([date, produit, value > 0 ? `+${value}` : value, user]);
}

function openHistorique() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Historique");
  SpreadsheetApp.setActiveSheet(sheet);
}

function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("sidebar")
    .setTitle("📦 Inventaire Hiro")
    .setWidth(320);
  SpreadsheetApp.getUi().showSidebar(html);
}

function getListeProduits() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inventaire");
  const data = sheet.getRange("B2:B").getValues().flat().filter(String);
  return [...new Set(data)];
}

function ajouterStockDepuisSidebar(produit, quantite) {
  try {
    if (!produit) throw new Error("Aucun produit transmis.");
    if (quantite === undefined || isNaN(quantite)) throw new Error("Quantité invalide.");

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inventaire");
    const lastRow = sheet.getLastRow();

    for (let i = 2; i <= lastRow; i++) {
      const nom = sheet.getRange(i, 2).getValue();
      if (!nom) continue;

      if (nom.toString().trim() === produit.toString().trim()) {
        const current = parseInt(sheet.getRange(i, 3).getValue()) || 0;
        const newValue = current + quantite;
        sheet.getRange(i, 3).setValue(newValue);

        const user = Session.getActiveUser().getEmail();
        const date = new Date().toLocaleString("fr-FR");

        sendDiscordEmbed("✅ Stock ajouté", {
          produit,
          quantite: `+${quantite}`,
          date,
          user,
          total: newValue
        });

        return;
      }
    }

    throw new Error(`❌ Produit '${produit}' non trouvé dans Inventaire.`);
  } catch (e) {
    Logger.log("Erreur attrapée : " + e.message);
    throw new Error(e.message);
  }
}

function incrementStockDepuisSidebar(produit, quantite) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inventaire");
  const lastRow = sheet.getLastRow();

  for (let i = 2; i <= lastRow; i++) {
    const nom = sheet.getRange(i, 2).getValue();
    if (!nom) continue;

    if (nom.toString().trim() === produit.trim()) {
      const current = parseInt(sheet.getRange(i, 3).getValue()) || 0;
      const newValue = current + quantite;
      sheet.getRange(i, 3).setValue(newValue);

      const user = Session.getActiveUser().getEmail();
      const date = new Date().toLocaleString("fr-FR");

      sendDiscordEmbed("➖ Stock retiré", {
        produit,
        quantite,
        date,
        user,
        total: newValue
      });

      return;
    }
  }
}

function openStats() {
  const html = HtmlService.createHtmlOutputFromFile("stats")
    .setWidth(1920)
    .setHeight(1080);
  SpreadsheetApp.getUi().showModalDialog(html, "📈 Statistiques de Nate");
}

function getStatsData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inventaire");
  const data = sheet.getRange("B2:C").getValues();
  let totalProduits = 0;
  let totalQuantité = 0;

  data.forEach(([produit, qty]) => {
    if (produit && !isNaN(qty)) {
      totalProduits++;
      totalQuantité += parseInt(qty);
    }
  });

  return {
    produits: totalProduits,
    quantité: totalQuantité,
    dernièreMaj: new Date()
  };
}

function getQuantitesParProduit() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inventaire");
  const data = sheet.getRange("B2:C").getValues();
  const quantites = {};

  data.forEach(([produit, qte]) => {
    if (produit) {
      quantites[produit.trim()] = parseInt(qte) || 0;
    }
  });

  return quantites;
}

function sendDiscordEmbed(titre, data) {
  const url = "https://discord.com/api/webhooks/1362895965287088501/vnNQl2FFcQjGxqJc_g9AQ7zNTncgBrw9eOELJHEii-3z_Hz2NM6e_JFtJ-HlqZILE3a7";

  const payload = JSON.stringify({
    embeds: [
      {
        title: titre,
        color: data.quantite > 0 ? 65280 : 16711680,
        fields: [
          { name: "Produit", value: data.produit, inline: true },
          { name: "Quantité", value: `${data.quantite}`, inline: true },
          { name: "Total actuel", value: `${data.total}`, inline: true },
          { name: "Utilisateur", value: data.user, inline: false },
          { name: "Date", value: data.date, inline: false }
        ],
        footer: { text: "Système Nate Stock" }
      }
    ]
  });

  const options = {
    method: "post",
    contentType: "application/json",
    payload: payload
  };

  UrlFetchApp.fetch(url, options);
}
