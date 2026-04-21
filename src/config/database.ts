import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log(' Conexión a PostgreSQL exitosa');
    client.release();
  } catch (error) {
    console.error(' Error conectando a la base de datos:', error);
  }
};