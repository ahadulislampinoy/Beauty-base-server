const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

// Middlewares
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Beauty Base Server Is Working");
});

// MongoDB config
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.5a1umhj.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// Verify jwt
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "Unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const serviceCollection = client.db("beautyBase").collection("services");
    const reviewCollection = client.db("beautyBase").collection("reviews");

    // Jwt
    app.post("/jwt", (req, res) => {
      const userEmail = req.body;
      const token = jwt.sign(userEmail, process.env.ACCESS_TOKEN, {
        expiresIn: "10d",
      });
      res.send({ token });
    });

    // Services
    app.get("/services", async (req, res) => {
      const limit = parseInt(req.query.limit);
      const query = {};
      const services = serviceCollection.find(query).limit(limit);
      const result = await services.toArray();
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const services = await serviceCollection.findOne(query);
      res.send(services);
    });

    app.post("/services", async (req, res) => {
      const service = req.body;
      const result = await serviceCollection.insertOne(service);
      res.send(result);
    });

    // Reviews
    app.post("/myreviews", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    app.get("/serviceReviews", async (req, res) => {
      const id = req.query.serviceId;
      const query = { serviceId: id };
      const reviews = reviewCollection.find(query, { sort: { date: -1 } });
      const result = await reviews.toArray();
      res.send(result);
    });

    app.get("/myreviews", verifyJWT, async (req, res) => {
      let query = {};
      const email = req.query.email;
      const decoded = req.decoded;
      if (req.query.email !== decoded.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      if (email) {
        query = { email: email };
      }
      const reviews = reviewCollection.find(query, { sort: { date: -1 } });
      const result = await reviews.toArray();
      res.send(result);
    });

    app.delete("/myreviews/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await reviewCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/myreviews/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const { feedback, rating } = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedReview = {
        $set: {
          feedback: feedback,
          rating: rating,
        },
      };
      const result = await reviewCollection.updateOne(
        filter,
        updatedReview,
        options
      );
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Beauty Base Server Is Running On Port ${port}`);
});
