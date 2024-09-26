const PdfPrinter = require('pdfmake');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('./marcenariadb');
const { PrismaClient } = require('@prisma/client');
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
    const { fullName, role} = await prisma.user.findUnique({
        where: {
            id: user.id
        }
    })

    res.json({ fullName, role})
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
                { text: new Intl.NumberFormat('pt-Br', { style: 'currency', currency: 'BRL'}).format(item.unitValue), alignment: 'right' },
                item.quantity,
                { text: new Intl.NumberFormat('pt-Br', { style: 'currency', currency: 'BRL'}).format(item.quantity * item.unitValue), alignment: 'right' }
            ]
        })

        budgetItems.push([
            '',
            '',
            {
                colSpan: 3,
                text: `Valor Total: ${new Intl.NumberFormat('pt-Br', { style: 'currency', currency: 'BRL'}).format(totalValue)}`,
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
