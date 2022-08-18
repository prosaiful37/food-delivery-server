const express = require("express");
const cors = require("cors");
require("dotenv").config();
var nodemailer = require('nodemailer');
var sgTransport = require('nodemailer-sendgrid-transport'); 
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRETE_KEY);




// middllware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iuu8y.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});



  // verify jwt
  function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
      if (err) {
        return res.status(403).send({ message: 'Forbidden access' })
      }
      req.decoded = decoded;
      next();
    });
  }


  // email sender
  var emailSenderOption = {
    auth: {
      
      api_key: process.env.EMAIL_SENDER_KEY
    }
  }


  const emailClient = nodemailer.createTransport(sgTransport(emailSenderOption));

  function  sendOrderMail(order) {
    const {userEmail, name} = order;
    var email = {
      from: process.env.EMAIL_SENDER,
      to: userEmail,
      subject: `Your order for ${name} is confirm `,
      text: `Your order for ${name} is confirm `,
      html: `
        <div>
          <p>Hello your email ${userEmail} </p>        
          <h3>Your order ${name} is confirm </h3>  
          <h3>Our Address</h3>
          <p>Anodor killa,25/8 new banderban</p>
          <p>Bangladesh</p>     
          <a href="www.google.com" >Unsubcribe</a> 
        
        </div>      
      `
    };

    emailClient.sendMail(email, function(err, info){
      if (err ){
        console.log(err);
      }
      else {
        console.log('Message sent: ' , info);
      }
  });
  }



  
  // email sender payment confirmation 
  // function  sendPaymentConfirmaitonEmail(order) {
  //   const {userEmail, name} = order;
  //   var email = {
  //     from: process.env.EMAIL_SENDER,
  //     to: userEmail,
  //     subject: `We have recived your payment for ${name} is confirm `,
  //     text: `We have recived your payment for ${name} is confirm `,
  //     html: `
  //       <div>
  //         <p>Hello your email ${userEmail} </p>        
  //         <h3>Thank your, for Your paymant ${name} is confirm </h3>  
  //         <h3>we have received your payment</h3>  
  //         <h3>Our Address</h3>
  //         <p>Anodor killa,25/8 new banderban</p>
  //         <p>Bangladesh</p>     
  //         <a href="www.google.com" >Unsubcribe</a> 
        
  //       </div>      
  //     `
  //   };

  //   emailClient.sendMail(email, function(err, info){
  //     if (err ){
  //       console.log(err);
  //     }
  //     else {
  //       console.log('Message sent: ' , info);
  //     }
  // });
  // }


async function run() {
  try {
    await client.connect();
    const productsCollection = client.db("pizza_app").collection("products");
    const ordersCollection = client.db("pizza_app").collection("orders");
    const usersCollection = client.db("pizza_app").collection("users");
    const reviewsCollection = client.db("pizza_app").collection("reviews");
    const paymentsCollection = client.db("pizza_app").collection("payments");



    // get all products
    app.get("/products", async (req, res) => {
      const query = {};
      const cursor = productsCollection.find(query);
      const products = await cursor.toArray();
      res.send(products);
    });

    // single menu product show
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await productsCollection.findOne(query);
      res.send(order);
    });

    // user update by email
    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      const token = jwt.sign({email: email}, process.env.ACCESS_TOKEN_SECRET,  { expiresIn: '1h' })
      res.send({result, token});
    });


    app.get('/admin/:email', async(req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({email: email})
      const isAdmin = user.role === "admin";
      res.send({admin: isAdmin});
    })

    

    // user admin by email
    app.put("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requister = req.decoded.email;
      const requisterAccount = await usersCollection.findOne({email: requister});
      if(requisterAccount.role === 'admin'){
        const filter = { email: email };
        const updateDoc = {
          $set: {role: 'admin'},
        };
        const result = await usersCollection.updateOne(
          filter,
          updateDoc
        );
        const token = jwt.sign({email: email}, process.env.ACCESS_TOKEN_SECRET,  { expiresIn: '1h' })
        res.send(result);
      }
      else{
        res.status(403).send({message: 'forbidden access'})
      }
      
    });


    // single data post in order
    app.post("/orders", async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);
      console.log('email send')
      sendOrderMail(order)
      res.send(result);
    });


    app.get('/orders/:id', verifyJWT, async(req, res) => {
      const id = req.params.id;
      const query = {_id: ObjectId(id)}
      const order = await ordersCollection.findOne(query)
      res.send(order);
    })

    // get all orders
    // app.get("/orders", verifyJWT, async (req, res) => {
    //   const query = {};
    //   const cursor = ordersCollection.find(query);
    //   const orders = await cursor.toArray();
    //   res.send(orders);
    // });

    app.delete('/orders/:id', verifyJWT, async(req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await ordersCollection.deleteOne(query);
      res.send(order);
    })


      app.get('/orders', verifyJWT, async (req, res) => {
      const userEmail = req.query.userEmail;
      const decodedEmail = req.decoded.email;
      if (userEmail === decodedEmail) {
        const query = { userEmail: userEmail };
        const order = await ordersCollection.find(query).toArray();
        return res.send(order);
      }
      else {
        return res.status(403).send({ message: 'forbidden access' });
      }

    });

    app.patch('/orders/:id', verifyJWT, async (req, res) =>{
      const id = req.params.id;
      const payment = req.body;
      const filter = {_id: ObjectId(id)}
      const updateDoc = {
        $set: {
          paid: true,
          transctionId : payment.transctionId
        }
      }


      const result = await paymentsCollection.insertOne(payment);
      const ordersUpdate = await ordersCollection.updateOne(filter, updateDoc);
      res.send(updateDoc);

    })

    // all user api 
    app.get('/users', verifyJWT, async(req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    })

    app.delete('/users/:email', verifyJWT, async(req, res) => {
      const email = req.params.email;
      const query = {email: email}
      const user = await usersCollection.deleteOne(query)
      res.send(user);
    })



    // all review get api
    app.get('/reviews',  async(req, res) => {
      const reviews = await reviewsCollection.find().toArray() ;
      res.send(reviews);
    })

    // reviews single add api for post 
    app.post('/reviews', async(req, res) => {
      const review = req.body;
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    })


    // payments method
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const order = req.body;
      const price = order.price;
      const amount = price*100;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card']

     });

     res.send({
      clientSecret: paymentIntent.client_secret,
    })

    
    
    
    })
  




  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from slice pizza!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
