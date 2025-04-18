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
    pass: 'dwjnisetnbqiwpzn' // aplikacné heslo z 2FA
  }
});

app.post('/send', (req, res) => {
  const data = req.body;

  const formType = data.formType === 'ad' ? 'Tlačená reklama' : 'Nápojový lístok';
  const userName = data.userName || '-';
  const businessName = data.businessName || '-';

  // Odstráň z objektu systémové polia, ktoré už zobrazujeme samostatne
  const excludedKeys = ['formType', 'userName', 'businessName'];

  // Vytvor HTML výpis
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
    if (excludedKeys.includes(key)) continue;
    const value = Array.isArray(data[key]) ? data[key].join(', ') : data[key];
    const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
    htmlContent += `
    <tr>
      <td style="border-bottom: 1px solid #eee;"><strong>${formattedKey}</strong></td>
      <td style="border-bottom: 1px solid #eee;">${value}</td>
    </tr>
  `;
  }

  htmlContent += `
      </tbody>
    </table>
  </div>
`;

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
