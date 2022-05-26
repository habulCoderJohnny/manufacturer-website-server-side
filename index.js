const express = require('express')
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


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
    const profileCollection = client.db("fish-zone").collection("profiles");
    const paymentCollection = client.db("fish-zone").collection("payments");
    

    //Middleware for Admin
    const verifiedAdmin = async(req,res,next)=>{
      const adminRequester = req.decoded.email;
      const adminRequesterMail = await userCollection.findOne({email: adminRequester});
      if (adminRequesterMail.role ==='admin') {
          next();
      }
      else{
       res.status(403).send({message:"forbidden, Only admin can Access"});
      }

    }

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
      const result = await orderCollection.insertOne(orders);
      return res.send({ success: true, result });
    })

    //find user Individual order Find using email 
    app.get('/order', async (req, res) => {
      const customerMail = req?.query?.customerMail;
      const decodedEmail = req?.decoded?.email;
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
    app.delete('/order/:email', verifiedToken, async (req, res) => {
      const email = req.params.email;
      const filter = { customerMail: email };
      const result = await orderCollection.deleteOne(filter);
      res.send(result);
    });

    //GET review myOWN Inserted DATA
    app.get('/review',async (req, res) => {
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

    //Add product
    app.post('/equitment', [verifiedAdmin],  async (req, res) => {
      const addProduct = req.body;
      const result = await partsCollection.insertOne(addProduct);
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
    app.get('/users', [verifiedToken,verifiedAdmin], async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    })


     //Profile data stored
     app.post('/profile', verifiedToken, async (req, res) => {
      const profileInfo = req.body;
      const result = await profileCollection.insertOne(profileInfo);
      res.send(result);
    });

    // Given role:Admin on user 
    app.put('/user/admin/:email',[verifiedToken, verifiedAdmin], async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: 'admin' },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });


    //Without admin U cant entry users route
    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === 'admin';
      res.send({ admin: isAdmin })
    })

    // gET underscore Id for payment 
    app.get('/order/:id', verifiedToken, async (req,res)=>{
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const ordered = await orderCollection.findOne(query);
      res.send(ordered);

    })
    // PAYMENT GETWAY 
    app.post('/create-payment-intent', verifiedToken, async (req,res)=>{
      const { price } = req.body;
      const amount = price*100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount : amount,
        currency: 'usd',
        payment_method_types : ['card']
      });
      res.send({clientSecret: paymentIntent.client_secret})
    });

      //PAYMENT DATA RESERVED IN DATABASE
      app.patch('/order/:id', verifiedToken, async(req, res) =>{
        const id  = req.params.id;
        const payment = req.body;
        const filter = {_id: ObjectId(id)};
        const updatedDoc = {
          $set: {
            paid: true,
            transactionId: payment.transactionId
          }
        }
        const result = await paymentCollection.insertOne(payment);
        const updatedBooking = await orderCollection.updateOne(filter, updatedDoc);
        res.send(updatedBooking);
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