const PdfPrinter = require('pdfmake');
const express = require('express');
var cors = require('cors')
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(cors())

app.post('/generate-pdf', async (req, res) => {
    try {
        const {vendorName, clientName, items } = req.body
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


        let id = 0
        let totalValue = 0
        const tableItems = items.map((item) => {
            id++
            totalValue += item.quantity * item.unitValue
            return [id, item.description, new Intl.NumberFormat('pt-Br', { style: 'currency', currency: 'BRL'}).format(item.unitValue), item.quantity]
        })

        tableItems.push([
            '',
            '',
            {
                colSpan: 2,
                text: `Valor Total: ${new Intl.NumberFormat('pt-Br', { style: 'currency', currency: 'BRL'}).format(totalValue)}`,
                bold: true,
                fontSize: 14,
                alignment: 'right',
                margin: [0, 20, 0, 0]
            }
        ])

        var dd = {
            pageMargins: [20, 30, 20, 20], // [left, top, right, bottom]
            content: [
                {
                    image: 'logo_artfaav_rgb.png',
                    width: 150,
                    style: 'center'
                },
                {
                    text: `Cliente: ${clientName}`,
                    style: 'subheader',
                    alignment: 'left'
                },
                {
                    text: `Data de validade: ${new Date().toLocaleDateString()}`,
                    style: 'subheader',
                    alignment: 'left'
                },
                {
                    text: `Vendedor: ${vendorName}`,
                    style: 'subheader',
                    alignment: 'left'
                },
                {
                    margin: [0, 20, 0, 0],
                    table: {
                        headerRows: 1,
                        widths: [20, 350, '*', 30],
                        body: [
                            [
                                { text: 'ID', bold: true },
                                { text: 'Descrição', bold: true },
                                { text: 'Valor unitário', bold: true },
                                { text: 'Qtd.', bold: true }
                            ],
                            ...tableItems,
                            // Add more rows as needed
                        ]
                    },
                    layout: 'lightHorizontalLines' // Optional layout style
                }
            ],
            styles: {
                center: {
                    alignment: 'center'
                },
                left: {
                    alignment: 'left'
                },
                subheader: {
                    fontSize: 12,
                    margin: [0, 10, 0, 0] // Top, right, bottom, left margins
                }
            }

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
