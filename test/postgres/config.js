module.exports = {
    username: process.env.POSTGRES_USERNAME || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB_NAME || 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    dialect: 'postgres',
    dialectOptions: {
        ssl: false
    }
  }