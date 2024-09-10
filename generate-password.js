const bcrypt = require('bcryptjs');
const hashedPassword = bcrypt.hashSync('admin');
console.log(hashedPassword);
