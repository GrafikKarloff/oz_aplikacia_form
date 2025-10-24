// ---------- server.js (jednoduchá verzia s NotificationAPI) ----------
require('dotenv').config(); // načíta premenné z .env

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

// NotificationAPI SDK (CommonJS require -> .default)
const notificationapi = require('notificationapi-node-server-sdk').default;

// Bezpečnostná kontrola env premenných (pomôže chytiť preklep)
if (!process.env.NOTIF_API_CLIENT_ID || !process.env.NOTIF_API_CLIENT_SECRET) {
  console.error('❌ Chýba NOTIF_API_CLIENT_ID alebo NOTIF_API_CLIENT_SECRET v .env');
  process.exit(1);
}

// Inicializácia SDK – EÚ endpoint
notificationapi.init(
  process.env.NOTIF_API_CLIENT_ID,
  process.env.NOTIF_API_CLIENT_SECRET,
  'https://api.eu.notificationapi.com'
);

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Multer – ukladáme do pamäte (aby sme vedeli ľahko spraviť Base64)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ========================= ROUTA /send =========================
app.post('/send', upload.array('photos'), async (req, res) => {
  try {
    const data = req.body;
    const files = req.files || [];

    // Tvoja pôvodná logika
    const formType = data.formType === 'ad' ? 'Tlačená reklama' : 'Nápojový lístok';
    const userName = data.userName || '-';
    const businessName = data.businessName || '-';

    const excludedKeys = ['formType', 'userName', 'businessName'];

    // Zoskupenie drinkov podľa typu (tvoja pôvodná logika)
    const tatrateaGroups = {};
    Object.keys(data).forEach(key => {
      if (key.startsWith('drink-')) {
        const category = key.replace('drink-', '');
        const drinks = Array.isArray(data[key]) ? data[key] : [data[key]];
        if (!tatrateaGroups[category]) tatrateaGroups[category] = [];
        drinks.forEach(drink => {
          const drinkId = `${category}-${drink}`.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '');
          const priceKey = `price-${drinkId}`;
          const price = data[priceKey] || '';
          const fullText = price ? `${drink} — ${price} €` : drink;
          tatrateaGroups[category].push(fullText);
        });
      }
    });

    // HTML obsah e-mailu (ponechaná tvoja štruktúra)
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #007bff;">Nový formulár - ${formType}</h2>
        <p><strong>Používateľ:</strong> ${userName}</p>
        <p><strong>Prevádzka:</strong> ${businessName}</p>
        <hr>
        <table cellspacing="0" cellpadding="10" style="border-collapse: collapse; width: 100%; font-size: 15px;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th style="text-align: left; border-bottom: 1px solid #ccc;">Položka</th>
              <th style="text-align: left; border-bottom: 1px solid #ccc;">Hodnota</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (const key in data) {
      if (excludedKeys.includes(key) || key.startsWith('drink-') || key.startsWith('price-')) continue;
      const value = Array.isArray(data[key]) ? data[key].join(', ') : data[key];
      if (!value || value.trim() === '') continue;
      const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
      htmlContent += `
        <tr>
          <td style="border-bottom: 1px solid #eee;"><strong>${formattedKey}</strong></td>
          <td style="border-bottom: 1px solid #eee;">${value}</td>
        </tr>
      `;
    }

    htmlContent += `</tbody></table>`;

    // Sekcia TATRATEA drinkov
    if (Object.keys(tatrateaGroups).length > 0) {
      htmlContent += `<h3 style="margin-top: 30px; color: #007bff;">Zvolené drinky TATRATEA</h3>`;
      for (const category of Object.keys(tatrateaGroups)) {
        htmlContent += `<p style="margin: 10px 0 5px;"><strong>${category}</strong></p><ul>`;
        tatrateaGroups[category].forEach(drink => {
          const [name, ...rest] = drink.split(' - ');
          const formatted = `<strong>${name}</strong>${rest.length ? ' - ' + rest.join(' - ') : ''}`;
          htmlContent += `<li>${formatted}</li>`;
        });
        htmlContent += `</ul>`;
      }
    }

    htmlContent += `</div>`;

    // Prílohy → NotificationAPI chce Base64
    const attachments = files.map(file => ({
      filename: file.originalname,
      content: file.buffer.toString('base64'),
      contentType: file.mimetype
    }));

    // === TVOJA PODMIENKA PRÍJEMCU (ponechaná) ===
    const recipient = data.formType === 'drink' ? 'grafik2@karloff.sk' : 'grafik@karloff.sk';

    // Odoslanie cez NotificationAPI
    // "type" si nechaj "ozaplikacia" (musí existovať v tvojom NotificationAPI projekte)
    await notificationapi.send({
      type: 'ozaplikacia',
      to: { id: recipient, email: recipient },
      email: {
        subject: `Nový OZ formulár: ${formType}`,
        html: htmlContent,
        // po overení domény si sem môžeš dať vlastný odosielací email
        senderName: 'OZ Aplikácia',
        senderEmail: 'no-reply@tvoja-domena.sk'
      },
      options: {
        email: {
          attachments
        }
      }
    });

    console.log('✅ NotificationAPI OK');
    res.status(200).send('OK');
  } catch (err) {
    console.error('❌ Chyba pri odosielaní:', err);
    res.status(500).send('Chyba pri odosielaní emailu.');
  }
});

// ===============================================================

app.listen(3000, () => {
  console.log('✅ Server beží na http://localhost:3000');
});
