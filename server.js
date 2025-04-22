const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'grafik.karloff@gmail.com',
    pass: 'dwjnisetnbqiwpzn' // aplikacné heslo
  }
});

app.post('/send', (req, res) => {
  const data = req.body;

  const formType = data.formType === 'ad' ? 'Tlačená reklama' : 'Nápojový lístok';
  const userName = data.userName || '-';
  const businessName = data.businessName || '-';

  const excludedKeys = ['formType', 'userName', 'businessName'];

  // TATRATEA drinky podľa typu
  const tatrateaGroups = {};

  Object.keys(data).forEach(key => {
    if (key.startsWith('drink-')) {
      const category = key.replace('drink-', '');
      const values = Array.isArray(data[key]) ? data[key] : [data[key]];
      if (!tatrateaGroups[category]) tatrateaGroups[category] = [];
      tatrateaGroups[category] = tatrateaGroups[category].concat(values);
    }
  });

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

  // Pridaj drinky pod každú kategóriu
  if (Object.keys(tatrateaGroups).length > 0) {
    htmlContent += `<h3 style="margin-top: 30px;">Zvolené drinky TATRATEA</h3>`;
    for (const category in tatrateaGroups) {
      htmlContent += `<h4 style="margin-bottom: 5px;">${category}</h4><ul>`;
      tatrateaGroups[category].forEach(drink => {
        htmlContent += `<li>${drink}</li>`;
      });
      htmlContent += `</ul>`;
    }
  }

  htmlContent += `</div>`;

  const mailOptions = {
    from: 'grafik.karloff@gmail.com',
    to: 'grafik@karloff.sk',
    subject: `Nový formulár - ${formType}`,
    html: htmlContent
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('❌ Chyba pri odosielaní:', error);
      return res.status(500).send('Chyba pri odosielaní emailu.');
    }
    console.log('✅ E-mail odoslaný:', info.response);
    res.status(200).send('OK');
  });
});

app.listen(3000, () => {
  console.log('✅ Server beží na http://localhost:3000');
});
