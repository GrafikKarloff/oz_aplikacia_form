const express = require('express');
const nodemailer = require('nodemailer');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'grafik.karloff@gmail.com',
    pass: 'dwjnisetnbqiwpzn'
  }
});

app.post('/send', upload.array('photos'), (req, res) => {
  try {
    const data = req.body;
    const files = req.files;

    const formType = data.formType === 'ad' ? 'Tlačená reklama' : 'Nápojový lístok';
    const userName = data.userName || '-';
    const businessName = data.businessName || '-';

    const excludedKeys = ['formType', 'userName', 'businessName'];

    // Zoskupenie drinkov podľa typu
    const tatrateaGroups = {};
    Object.keys(data).forEach(key => {
      if (key.startsWith('drink-')) {
        const category = key.replace('drink-', '');
        const values = Array.isArray(data[key]) ? data[key] : [data[key]];
        if (!tatrateaGroups[category]) {
          tatrateaGroups[category] = [];
        }
        tatrateaGroups[category] = tatrateaGroups[category].concat(values);
      }
    });

    // Základný obsah e-mailu
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
      if (excludedKeys.includes(key) || key.startsWith('drink-')) continue;
      const value = Array.isArray(data[key]) ? data[key].join(', ') : data[key];
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
          htmlContent += `<li>${drink}</li>`;
        });
        htmlContent += `</ul>`;
      }
    }

    htmlContent += `</div>`;

    // Prílohy
    const attachments = files.map(file => ({
      filename: file.originalname,
      content: file.buffer
    }));

    
    const recipient = data.formType === 'drink' ? 'grafik@karloff.sk' : 'grafik@karloff.sk';

    const mailOptions = {
      from: 'FORMULÁR Obchodný zástupcovia',
      to: recipient,
      subject: `Nový OZ formulár: ${formType}`,
      html: htmlContent,
      attachments: attachments
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('❌ Chyba pri odosielaní:', error);
        return res.status(500).send('Chyba pri odosielaní emailu.');
      }
      console.log('✅ E-mail odoslaný:', info.response);
      res.status(200).send('OK');
    });

  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).send('Chyba servera.');
  }
});

app.listen(3000, () => {
  console.log('✅ Server beží na http://localhost:3000');
});
