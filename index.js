const express = require('express')
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId, Admin } = require('mongodb');


app.use(cors());
app.use(express.json());

//CONNECT TO MONGODB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gwgpe.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//Middleware
//jwt-token-to-backend-for-Verification
function verifiedToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    //console.log('ABC');
    return res.status(401).send({ message: 'UnAuthorized access! Kire tor token koi? Its not ur data!' });
  }

  //Iqnore Bearer
  const token = authHeader.split(' ')[1];
  // VERIFY user-token of 
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden! Access denied.' })
    } //Decoded valid user representor
    req.decoded = decoded;
    //console.log(decoded);
    next();
  });
}


async function run() {
  try {
    await client.connect();
    // console.log('db connected!!');
    const partsCollection = client.db("fish-zone").collection("equitments");
    const orderCollection = client.db("fish-zone").collection("orders");
    const reviewCollection = client.db("fish-zone").collection("reviews");
    const userCollection = client.db("fish-zone").collection("users");

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
      const query = { name: orders.name, customerMail: orders.customerMail }
      const existOrder = await orderCollection.findOne(query);
      if (existOrder) {
        return res.send({ success: false, orders: existOrder });
      }
      const result = await orderCollection.insertOne(orders);
      return res.send({ success: true, result });
    })

    //find user Individual order Find using email 
    app.get('/order', [verifiedToken], async (req, res) => {
      const customerMail = req.query.customerMail;
      const decodedEmail = req.decoded.email;
      if (customerMail === decodedEmail) {
        const query = { customerMail: customerMail };
        const orderShow = await orderCollection.find(query).toArray();
        res.send(orderShow);
      }
      else {
        return res.status(403).send({ message: "forbidden, Its not your cup of Tea" })
      }
    })

    //Delete user Individual order data using email
    app.delete('/parts/:email', [verifiedToken], async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await orderCollection.deleteOne(filter);
      res.send(result);
    })

    //GET review myOWN Inserted DATA
    app.get('/review', [verifiedToken],async (req, res) => {
      const query = {};
      const cursor = reviewCollection.find(query);
      const reviews = await cursor.toArray();
      res.send(reviews);
    });


    //Customer review Stored
    app.post('/review',[verifiedToken], async (req, res) => {
      const reviews = req.body;
      const result = await reviewCollection.insertOne(reviews);
      res.send(result);
    });

    //all user in database | implementToken
    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' }) //Jwt token issue-1st then>Verify
      res.send({ result, token });
    });

    //OUR ALL USER INFO API 
    app.get('/users', [verifiedToken], async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    })

    // Given role:Admin on user 
    app.put('/user/admin/:email',[verifiedToken], async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: 'admin' },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
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