require("dotenv").config();

const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;

console.log("URI loaded:", !!uri);

const client = new MongoClient(uri);

async function test() {
  try {
    await client.connect();
    console.log("CONNECTED!");
    await client.db("admin").command({ ping: 1 });
    console.log("PING SUCCESSFUL!");
  } catch (err) {
    console.error("CONNECTION FAILED:");
    console.error(err);
  } finally {
    await client.close();
  }
}

test();
