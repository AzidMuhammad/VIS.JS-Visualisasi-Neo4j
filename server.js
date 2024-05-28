const express = require('express');
const neo4j = require('neo4j-driver');
const path = require('path');
const app = express();
const port = 3000;

// Konfigurasi koneksi Neo4j
const uri = 'bolt://localhost:7687';
const user = 'neo4j';
const password = '012345678';

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

// Middleware untuk melayani file statis dari direktori 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Fungsi pembantu untuk memformat Tanggal Neo4j ke string ISO
function neo4jDateToISO(date) {
  if (date && date.year && date.month && date.day) {
    return `${date.year.low}-${String(date.month.low).padStart(2, '0')}-${String(date.day.low).padStart(2, '0')}`;
  }
  return null;
}

// NETWORK
// Endpoint untuk mendapatkan data jaringan
app.get('/network-data', async (req, res) => {
  const session = driver.session();
  try {
    console.log('Running Neo4j query...');
    const result = await session.run('MATCH (n:Artis)-[r:MEMBUAT]->(m:Karya) RETURN n, r, m LIMIT 50');

    const nodes = [];
    const edges = [];
    const nodeIds = new Set();

    result.records.forEach(record => {
      const n = record.get('n');
      const m = record.get('m');
      const r = record.get('r');

      if (!nodeIds.has(n.identity.low)) {
        nodes.push({
          id: n.identity.low,
          label: n.properties.Nama || `Artis ${n.properties.Nama}`,
          image: '/image/pengunjung.png', // path gambar yang sesuai
          shape: 'image'
        });
        nodeIds.add(n.identity.low);
      }

      if (!nodeIds.has(m.identity.low)) {
        nodes.push({
          id: m.identity.low,
          label: m.properties.Nama || `Karya ${m.properties.Nama}`,
          image: '/image/galeri.png', // path gambar yang sesuai
          shape: 'image'
        });
        nodeIds.add(m.identity.low);
      }

      edges.push({ from: n.identity.low, to: m.identity.low });
    });

    res.json({ nodes, edges });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Error fetching data');
  } finally {
    await session.close();
  }
});

// TIMELINE
// Endpoint untuk mendapatkan data timeline
app.get('/timeline-data', async (req, res) => {
  const session = driver.session();
  try {
    console.log('Running Neo4j query for timeline...');
    const result = await session.run('MATCH (n:Pengunjung) RETURN n LIMIT 25');

    const items = result.records.map(record => {
      const Pengunjung = record.get('n');
      return {
        id: Pengunjung.identity.low,
        content: Pengunjung.properties.Nama || `Pengunjung ${Pengunjung.properties.Nama}`,
        start: neo4jDateToISO(Pengunjung.properties.Tanggal_Kunjungan),
      };
    });

    res.json(items);
  } catch (error) {
    console.error('Error fetching timeline data:', error);
    res.status(500).send('Error fetching timeline data');
  } finally {
    await session.close();
  }
});

// GRAPH3D
// Endpoint untuk mendapatkan data Graph3D
app.get('/graph3d-data', async (req, res) => {
  const session = driver.session();
  try {
    console.log('Running Neo4j query for graph3d...');
    const result = await session.run('MATCH (n)-[r:MENGUNJUNGI_PAMERAN]->(m) RETURN n, r, m LIMIT 50');

    const items = result.records.map(record => {
      const n = record.get('n');
      const m = record.get('m');
      const r = record.get('r');
      return {
        x: n.identity.low,
        y: m.identity.low,
        z: Math.sin(n.identity.low / 20) * Math.cos(m.identity.low / 20) * 100, // Contoh nilai Z
        style: m.properties.Nama || ` ${m.properties.Nama}` // Nama atau label node
      };
    });

    res.json(items);
  } catch (error) {
    console.error('Error fetching graph3d data:', error);
    res.status(500).send('Error fetching graph3d data');
  } finally {
    await session.close();
  }
});

// Menjalankan server
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});

process.on('exit', async () => {
  await driver.close();
});
