const express = require('express')
const app = express()
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');


app.use(cors());
app.use(express.json());

//CONNECT TO MONGODB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gwgpe.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



async function run() {
  try {
    await client.connect();
    // console.log('db connected!!');
    const partsCollection = client.db("fish-zone").collection("equitments");

    //GET DATA myOWN Inserted DATA
    app.get('/equitment', async (req, res) => {
      const query = {};
      const cursor = partsCollection.find(query);
      const equitments = await cursor.toArray();
      res.send(equitments);
    });

  }
  finally {
    
  }


}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World from Huntor Fishzone developing server')
})

app.listen(port, () => {
  console.log(`Doctor app listening on port ${port}`)
})