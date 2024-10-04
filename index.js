const PdfPrinter = require('pdfmake');
const express = require('express');
const { format } = require('date-fns')
const brazzilianLocale = require('date-fns/locale/pt-BR')
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('./marcenariadb');
const { PrismaClient } = require('@prisma/client');
const {  numberInFull } = require('./util/numberInFull');
const prisma = new PrismaClient();
const SECRET_KEY = 'secret_key'

const app = express();


app.use(bodyParser.json());
app.use(cors());

// Login endpoint
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).send('Invalid credentials');
        }
        const token = jwt.sign({ user }, SECRET_KEY, { expiresIn: '8h' });
        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Middleware to verify JWT token
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, SECRET_KEY, (err, decoded) => {
            if (err) {
                return res.status(403).json({ message: 'Invalid or expired token' });
            }

            req.user = decoded;  // Attach decoded user info to the request
            next();  // Proceed to next middleware or route
        });
    } else {
        return res.status(401).json({ message: 'No token provided' });
    }
}

app.use(verifyToken);

app.get('/me', async (req, res) => {
    const { user } = req.user
    const { fullName, role } = await prisma.user.findUnique({
        where: {
            id: user.id
        }
    })

    res.json({ fullName, role })
})

app.post('/budget', async (req, res) => {
    try {
        const { clientName, budgetItems } = req.body

        const { user } = req.user

        const budget = {
            clientName,
            vendorId: user.id,
            budgetItems
        }

        await prisma.budget.create({
            data: {
                clientName,
                vendorId: user.id,
                budgetItems: {
                    create: budget.budgetItems
                }
            }
        })

        res.status(200).send()
    } catch (error) {
        console.log(error)
        res.status(400).json(error)
    }
})

app.put('/budget/:id', async (req, res) => {
    try {
        const { id } = req.params
        const { clientName, budgetItems } = req.body

        const { user } = req.user

        const budget = {
            clientName,
            vendorId: user.id,
            budgetItems
        }

        const ids = budget.budgetItems.filter((item) => {
            return !!item.id
        }).map((item) => {
            return item.id
        })

        const itemsToUpdate = budget.budgetItems.filter((item) => {
            return !!item.id
        })

        await prisma.budget.update({
            where: {
                id
            },
            data: {
                budgetItems: {
                    deleteMany: {
                        budgetId: id
                    },
                    createMany: {
                        data: budget.budgetItems
                    },
                },
            }
        })

        res.status(200).send()
    } catch (error) {
        console.log(error)
        res.status(400).json(error)
    }
})

app.get('/budget', async (req, res) => {
    try {
        const { user } = req.user

        const result = await prisma.budget.findMany({
            where: user.role === 'vendor' ? { vendorId: user.id } : {},
            include: {
                budgetItems: true,
                vendor: true
            }
        })

        res.json(result)
    } catch (error) {
        console.error(error);
        res.status(500).json(error);
    }
});

app.get('/budget/:id', async (req, res) => {
    try {
        const { id } = req.params

        const budget = await prisma.budget.findUnique({
            where: {
                id
            },
            include: {
                vendor: true,
                budgetItems: true
            }
        })

        res.json(budget)
    } catch (error) {
        console.error(error);
        res.status(500).json(error);
    }
});

app.get('/budget/:id/print', async (req, res) => {
    try {
        const { id } = req.params

        const budget = await prisma.budget.findUnique({
            where: {
                id
            },
            include: {
                vendor: true,
                budgetItems: true
            }
        })

        // Define font files
        var fonts = {
            Roboto: {
                normal: `${__dirname}/fonts/Roboto-Regular.ttf`,
                bold: `${__dirname}/fonts/Roboto-Medium.ttf`,
                italics: `${__dirname}/fonts/Roboto-Italic.ttf`,
                bolditalics: `${__dirname}/fonts/Roboto-MediumItalic.ttf`
            }
        };

        var printer = new PdfPrinter(fonts);


        let itemId = 0
        let totalValue = 0

        const budgetItems = budget.budgetItems.map((item) => {
            itemId++
            totalValue += item.quantity * item.unitValue
            return [
                itemId,
                item.description,
                { text: new Intl.NumberFormat('pt-Br', { style: 'currency', currency: 'BRL' }).format(item.unitValue), alignment: 'right' },
                item.quantity,
                { text: new Intl.NumberFormat('pt-Br', { style: 'currency', currency: 'BRL' }).format(item.quantity * item.unitValue), alignment: 'right' }
            ]
        })

        budgetItems.push([
            '',
            '',
            {
                colSpan: 3,
                text: `Valor Total: ${new Intl.NumberFormat('pt-Br', { style: 'currency', currency: 'BRL' }).format(totalValue)}`,
                bold: true,
                fontSize: 14,
                alignment: 'right',
                margin: [0, 20, 0, 0]
            }
        ])

        var dd = {
            pageMargins: [20, 30, 20, 20], // [left, top, right, bottom]
            pageSize: 'A4',
            content: [
                {
                    image: `${__dirname}/logo_artfaav_rgb.png`,
                    width: 150,
                    style: 'center'
                },
                {
                    text: `Cliente: ${budget.clientName}`,
                    style: 'subheader',
                    alignment: 'left'
                },
                {
                    text: `Data de validade: ${new Date().toLocaleDateString('pt-Br')}`,
                    style: 'subheader',
                    alignment: 'left'
                },
                {
                    text: `Vendedor: ${budget.vendor.fullName}`,
                    style: 'subheader',
                    alignment: 'left'
                },
                {
                    margin: [0, 20, 0, 0],
                    table: {
                        headerRows: 1,
                        widths: [15, '*', 75, 25, 100],
                        body: [
                            [
                                { text: 'ID', bold: true },
                                { text: 'Descrição', bold: true },
                                { text: 'Valor unitário', bold: true, alignment: 'right' },
                                { text: 'Qtd.', bold: true },
                                { text: 'Total', bold: true, alignment: 'right' }
                            ],
                            ...budgetItems,
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

app.get('/contract/from-budget/:budgetId/print', async (req, res) => {
    try {
        const { budgetId } = req.params

        const budget = await prisma.budget.findUnique({
            where: {
                id: budgetId
            },
            include: {
                vendor: true,
                budgetItems: true
            }
        })

        // Define font files
        var fonts = {
            Roboto: {
                normal: `${__dirname}/fonts/Roboto-Regular.ttf`,
                bold: `${__dirname}/fonts/Roboto-Medium.ttf`,
                italics: `${__dirname}/fonts/Roboto-Italic.ttf`,
                bolditalics: `${__dirname}/fonts/Roboto-MediumItalic.ttf`
            }
        };

        var printer = new PdfPrinter(fonts);


        let itemId = 0
        let totalValue = 0

        const budgetItemsDescription = budget.budgetItems.map((item) => {
            itemId++
            totalValue += item.unitValue * item.quantity
            return `${itemId} - ${item.description}`
        })

        var dd = {
            pageMargins: [40, 30, 40, 20], // [left, top, right, bottom]
            pageSize: 'A4',
            content: [
                {
                    image: `${__dirname}/logo_artfaav_rgb.png`,
                    width: 150,
                    style: 'center',
                    alignment: 'center'
                },
                {
                    text: 'RUA WILSOM BASANELLI Nº100 – MINIDIST. IND.\nSÃO JOSE DO RIO PRETO - SP\nFONE: 17 – 3513-0326',
                    style: 'subheader'
                },
                {
                    text: '\n\nCONTRATO PARTICULAR DE PRESTAÇÃO DE SERVIÇO\n\n',
                    style: 'title'
                },
                {
                    text: [
                        { text: 'DE UM LADO A EMPRESA ', bold: true },
                        'A L FERRARI MOVEIS, SITUADA NO ENDEREÇO ACIMA CITADO, CNPJ 31.696.626/0001-08, DAQUI EM DIANTE SIMPLESMENTE CHAMADA DE ',
                        { text: 'CONTRATADA', bold: true },
                        ', E DO OUTRO LADO, ',
                        { text: budget.clientName, bold: true },
                        `, PORTADOR DO CPF: CPF DO CLIENTE, RG: RG DO CLIENTE, ESTABELECIDO NA Rua, numero, complemento, CEP, cidade, estado. DAQUI POR DIANTE SIMPLESMENTE CHAMADO DE `,
                        { text: 'CONTRATANTE', bold: true },
                        ', TEM ENTRE SI JUSTO E CONTRATADO OS SERVIÇOS E MÓVEIS A SEREM EXECUTADOS, CONFORME DESCRIÇÃO A SEGUIR E PROJETOS APRESENTADOS.'
                    ]
                },
                {
                    text: '\n1a) Confecção e montagem conforme abaixo:\n',
                    style: 'section'
                },
                {
                    ul: budgetItemsDescription
                },
                {
                    text: '\n2a) VALORES E FORMA DE PAGAMENTO:',
                    style: 'section'
                },
                {
                    text: `O custo será de R$ ${ new Intl.NumberFormat('pt-Br', { style: 'currency', currency: 'BRL' }).format(totalValue)}, conforme orçamento apresentado, que será pago da seguinte maneira:\n`
                },
                {
                    ul: [
                        `Entrada no valor de R$ ${ new Intl.NumberFormat('pt-Br', { style: 'currency', currency: 'BRL' }).format(totalValue*0.4)} (${numberInFull(totalValue*0.4)} Reais)`,
                        'O restante na entrega dos móveis combinados, em depósito bancário na conta da empresa.'
                    ]
                },
                {
                    text: '\n3a) MÓVEIS SERÃO FABRICADOS E ENTREGUES EM 60 DIAS APÓS DEFINIÇÃO DO PROJETO E MEDIÇÃO PARA EXECUÇÃO.',
                    style: 'section'
                },
                {
                    text: '\n4a) GARANTIA:',
                    style: 'section'
                },
                {
                    text: 'A CONTRATADA DARA AO CONTRATANTE, ALÉM DA GARANTIA DE 90 DIAS DE QUE TRATA O CÓDIGO DO CONSUMIDOR, UMA GARANTIA COMPLEMENTAR DE 1 ANO SOBRE A PARTE ESTRUTURAL DOS MÓVEIS.'
                },
                {
                    text: `\nSÃO JOSÉ DO RIO PRETO, ${format(new Date(), 'PPPP', { locale: {
                        formatLong: brazzilianLocale.ptBR.formatLong,
                        localize: brazzilianLocale.ptBR.localize
                    } })}\n\n`,
                    style: 'date'
                },
                {
                    columns: [
                        {
                            text: '___________________________________\nA L FERRARI MOVEIS',
                            style: 'signature',
                            alignment: 'center'
                        },
                        {
                            text: `____________________________________\n${budget.clientName}`,
                            style: 'signature',
                            alignment: 'center'
                        }
                    ]
                }
            ],
            styles: {
                subheader: {
                    fontSize: 10,
                    alignment: 'center'
                },
                title: {
                    fontSize: 12,
                    bold: true,
                    alignment: 'center'
                },
                section: {
                    fontSize: 12,
                    bold: true
                },
                date: {
                    fontSize: 12,
                    alignment: 'center'
                },
                signature: {
                    fontSize: 12,
                    margin: [0, 50, 0, 0]
                }
            },
            defaultStyle: {
                fontSize: 12
            }
        };

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
