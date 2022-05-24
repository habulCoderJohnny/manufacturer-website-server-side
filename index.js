const express = require('express')
const app = express()
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


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
    const orderCollection = client.db("fish-zone").collection("orders");
    const reviewCollection = client.db("fish-zone").collection("reviews");

    //GET DATA myOWN Inserted DATA
    app.get('/equitment', async (req, res) => {
      const query = {};
      const cursor = partsCollection.find(query);
      const equitments = await cursor.toArray();
      res.send(equitments);
    });

    //Sent Individual data using Id 
    app.get('/equitment/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const equitment = await partsCollection.findOne(query);
      res.send(equitment);
    });
    //Inserted Individual Order data
    app.post('/order', async (req, res) => {
      const orders = req.body;
      //Limit one order per user per product 
      //(duplicate restricted)
      const query = { name: orders.name, email: orders.email }
      const existOrder = await orderCollection.findOne(query);
      if (existOrder) {
        return res.send({ success: false, orders: existOrder });
      }
      const result = await orderCollection.insertOne(orders);
      return res.send({ success: true, result });
    })

    //find user Individual order Find using email 
    app.get('/order', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const orderShow = await orderCollection.find(query).toArray();
      res.send(orderShow);
    })

    //Delete user Individual order data using email
    app.delete('/parts/:email', async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await orderCollection.deleteOne(filter);
      res.send(result);
    })

    //GET review myOWN Inserted DATA
    app.get('/review', async (req, res) => {
      const query = {};
      const cursor = reviewCollection.find(query);
      const reviews = await cursor.toArray();
      res.send(reviews);
    });


    //Customer review Stored
    app.post('/review', async (req, res) => {
      const reviews = req.body;
      const result = await reviewCollection.insertOne(reviews);
      res.send(result);
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