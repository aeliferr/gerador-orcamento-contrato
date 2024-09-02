const PdfPrinter = require('pdfmake');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

app.post('/generate-pdf', async (req, res) => {
    try {
        // Define font files
        var fonts = {
            Roboto: {
                normal: 'fonts/Roboto-Regular.ttf',
                bold: 'fonts/Roboto-Medium.ttf',
                italics: 'fonts/Roboto-Italic.ttf',
                bolditalics: 'fonts/Roboto-MediumItalic.ttf'
            }
        };

        var printer = new PdfPrinter(fonts);

        var dd = {
            content: [
                'First paragraph',
                'Another paragraph, this time a little bit longer to make sure, this line will be divided into at least two lines'
            ]
            
        }

        var options = {
            // ...
        }

        var chunks = [];

        var pdfDoc = printer.createPdfKitDocument(dd, options);
        
        pdfDoc.on('data', (chunk) => {
            chunks.push(chunk)
        })

        pdfDoc.on('end', () => {
            const result = Buffer.concat(chunks)
            res.setHeader('Content-Disposition', 'attachment; filename="invoice.pdf"');
            res.setHeader('Content-Type', 'application/pdf');
            res.contentType('application/pdf')
            res.send(result)
        })

        pdfDoc.end()
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while generating the PDF.');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
