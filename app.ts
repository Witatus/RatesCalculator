import express from 'express';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { parseStringPromise } from "xml2js";
import nodemailer from 'nodemailer';

let transporter = nodemailer.createTransport({
    service: process.env.MAIL_SERVICE,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

let mailOptions = {
    from: process.env.MAIL_USER,
    to: 'testsmtp1824@gmail.com',
    subject: 'Rates Email',
    text: 'No more rates to pay'
};

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.post('/calculate', async (req, res) => {

  // Na wejściu procesu należy udostępnić następujące parametry (lub wejście serwisu)

  // • Liczba rat wszystkich
  // • Liczba rat pozostałych do spłaty
  // • Wysokość raty
  // • Wartość finansowania
  // • Oprocentowanie
  const {
    totalInstallments,
    remainingInstallments,
    installmentAmount,
    financingValue,
    interestRate,
  } = req.body;

  // Pobieranie referencyjnej stopy procentowej
  const response = await axios.get(
    "https://static.nbp.pl/dane/stopy/stopy_procentowe.xml"
  );

  const parsedXml = await parseStringPromise(response.data);

  const referenceRateItems =
    parsedXml.stopy_procentowe.tabela[0].pozycja.filter(
      (item: { $: { id: string } }) => item.$.id === "ref"
    );
  const referenceRate = parseFloat(referenceRateItems[0].$.oprocentowanie);

  // Porównanie stóp procentowych
  if (interestRate > referenceRate) {
    return res.status(400).json({ message: "Interest rate is higher than reference rate"});
  }

  //  Jeśli oprocentowanie jest mniejsze lub równe wartości stopy referencyjnej, przelicz:

  // 1. Wartość kontraktu pozostałej do spłaty, zakładając, że wszystkie raty były płatne w wysokości zdefiniowanej na wejściu.

  const remainingValue = remainingInstallments * installmentAmount;

  // 2. Nową wartość rat pozostałych do spłaty przy oprocentowaniu równym wartości stopy referencyjnej.
  // https://www.wikihow.com/Calculate-an-Installment-Loan-Payment
  // A = P * 

    const newInstallmentValue = remainingValue * (referenceRate*(1+ referenceRate)^remainingInstallments)/((1+ referenceRate)^remainingInstallments-1);

  // 3. Zapisz przeliczone wartości jako nowy obiekt w bazie procesu ( lub w bazie danych).

  await prisma.credit.create({
    data: {
      remainingValue: remainingValue,
      newInstallmentValue: newInstallmentValue,
    },
  });

  // 4. Sprawdź, czy wartość raty jest mniejsza od 0 lub ujemna. Jeśli tak, załóż task w procesie, korzystając z task listy. ( w wersji bez Camunda może wysłać maila)
  
  if (newInstallmentValue <= 0) {
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        };
    });
  }

  res.json({ remainingValue, newInstallmentValue });
});

app.listen(3500, () => {
    console.log('Server running on port 3500');
});
