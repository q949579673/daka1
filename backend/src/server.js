import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  connectionLimit: 10
});

app.get('/api/health', async (_req, res) => {
  const [rows] = await pool.query('SELECT NOW() AS now_time');
  res.json({ ok: true, dbTime: rows[0].now_time });
});

app.get('/api/patients/:id/profile', async (req, res) => {
  const [patients] = await pool.query('SELECT id, real_name, nickname, phone, height_cm, initial_weight_kg, current_weight_kg FROM patients WHERE id=?', [req.params.id]);
  if (!patients.length) return res.status(404).json({ message: 'patient not found' });
  const [checkins] = await pool.query('SELECT checkin_date, weight_kg, sport_minutes, content FROM checkins WHERE patient_id=? ORDER BY checkin_date DESC LIMIT 30', [req.params.id]);
  res.json({ patient: patients[0], checkins });
});

app.get('/api/word-libraries', async (_req, res) => {
  const [rows] = await pool.query('SELECT id, category, word FROM word_library ORDER BY category, id DESC');
  res.json(rows);
});

app.post('/api/word-libraries', async (req, res) => {
  const { category, word } = req.body;
  if (!category || !word) return res.status(400).json({ message: 'category and word are required' });
  const [result] = await pool.query('INSERT INTO word_library(category, word) VALUES(?, ?)', [category, word.trim()]);
  res.status(201).json({ id: result.insertId, category, word });
});

app.delete('/api/word-libraries/:id', async (req, res) => {
  await pool.query('DELETE FROM word_library WHERE id=?', [req.params.id]);
  res.status(204).send();
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`API running on http://0.0.0.0:${port}`);
});
