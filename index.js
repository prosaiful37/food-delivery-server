const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const productsCollection = client.db('pizza_app').collection('products');




    // get all products
    app.get('/products', async(req, res) => {
        const query = {};
        const cursor = productsCollection.find(query);
        const products = await cursor.toArray();
        res.send(products);
    })

    // single menu product show
    app.get('/products/:id', async(req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) }
      const order = await productsCollection.findOne(query);
      res.send(order)
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
