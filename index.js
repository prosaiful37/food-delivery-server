const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

// middllware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iuu8y.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const productsCollection = client.db("pizza_app").collection("products");
    const ordersCollection = client.db("pizza_app").collection("orders");
    const usersCollection = client.db("pizza_app").collection("users");

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


    // single data post in order
    app.post("/orders", async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);
      res.send(result);
    });

    // get all orders
    // app.get("/orders", async (req, res) => {
    //   const query = {};
    //   const cursor = ordersCollection.find(query);
    //   const orders = await cursor.toArray();
    //   res.send(orders);
    // });

    // order data show table
    app.get("/orders", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const order = await ordersCollection.find(query).toArray();
      res.send(order);
    });
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
