const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const MongoClient = require("mongodb").MongoClient;
const router = express.Router();
const app = express();
const url = require("./secret");
const cors = require("cors");
var md5 = require("md5");
var ObjectId = require("mongodb").ObjectId;

app.use(bodyParser.json());
app.use(cors());
const client = new MongoClient(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

client.connect((err) => {
  app.route("/signup").post((req, res) => {
    const call = client.db("Milo").collection("User");
    const data = req.body;
    res.contentType("application/json");

    if (!String(data.name).trim()) {
      res.status(404).send({ error: "Name is empty" });
      return;
    }

    if (!String(data.username).trim()) {
      res.status(404).send({ error: "Username is empty" });
      return;
    }

    if (
      !/^[\-0-9a-zA-Z\.\+_]+@[\-0-9a-zA-Z\.\+_]+\.[a-zA-Z]{2,}$/.test(
        String(data.email)
      )
    ) {
      res.status(404).send({ error: "Invalid Email" });
      return;
    }

    if (!String(data.avatar).trim()) {
      res.status(404).send({ error: "Avatar is empty" });
      return;
    }

    if (!String(data.password).trim()) {
      res.status(404).send({ error: "Password is empty" });
      return;
    }

    data.money = data.money || 10000;
    data.experience = data.experience || 1;
    data.description = null;
    data.password = md5(data.password);

    call.findOne({ username: data.username }, function (err, result) {
      if (err) throw err;
      if (result) {
        res.status(400).send({ error: "Username already exists." });
        return;
      } else {
        call.findOne({ email: data.email }, function (err2, result2) {
          if (err2) throw err2;
          if (result2) {
            res.status(400).send({ error: "Email ID already exists." });
            return;
          } else {
            data.shopItems = [];
            console.log(data);
            call.insertOne(data).then((results) => {
              call.findOne({ email: data.email }).then((results2) => {
                const email = data.email;
                const token = jwt.sign(
                  { user_id: results2._id, email, username: data.username },
                  "ABCDEFGHIJK",
                  {
                    expiresIn: "30d",
                  }
                );

                const user = {
                  jwt: token,
                  name: data.name,
                  username: data.username,
                  email: data.email,
                  avatar: data.avatar,
                  exp: data.experience || null,
                  money: data.money || null,
                  desc: data.description || null,
                  shopItems: data.shopItems,
                };
                res.status(201).json(user);
              });
            });
          }
        });
      }
    });
  });

  app.route("/login").post((req, res) => {
    const call = client.db("Milo").collection("User");
    const data = req.body;
    res.contentType("application/json");

    if (
      !/^[\-0-9a-zA-Z\.\+_]+@[\-0-9a-zA-Z\.\+_]+\.[a-zA-Z]{2,}$/.test(
        String(data.email)
      )
    ) {
      res.status(404).send({ error: "Invalid Email" });
      return;
    }

    if (!String(data.password).trim()) {
      res.status(404).send({ error: "Password is empty" });
      return;
    }

    data.password = md5(data.password);
    call.findOne(data).then((results) => {
      if (results === null) {
        res.status(400).send({ error: "Incorrect Email ID or Password." });
        return;
      } else {
        console.log(results);
        const email = data.email;
        const token = jwt.sign(
          { user_id: results._id, email, username: results.username },
          "ABCDEFGHIJK",
          {
            expiresIn: "30d",
          }
        );
        const user = {
          jwt: token,
          name: results.name,
          username: results.username,
          email: results.email,
          avatar: results.avatar,
          exp: results.experience || null,
          money: results.money || null,
          desc: results.description || null,
          shopItems: results.shopItems,
        };
        res.status(201).json(user);
      }
    });
  });

  app.route("/contact").post((req, res) => {
    const call = client.db("Milo").collection("Contact");
    const data = req.body;
    res.contentType("application/json");

    if (
      !/^[\-0-9a-zA-Z\.\+_]+@[\-0-9a-zA-Z\.\+_]+\.[a-zA-Z]{2,}$/.test(
        String(data.email)
      )
    ) {
      res.status(404).send({ error: "Invalid Email" });
      return;
    }

    if (!String(data.name).trim()) {
      res.status(404).send({ error: "Name is empty" });
      return;
    }

    if (!String(data.message).trim()) {
      res.status(404).send({ error: "Message is empty" });
      return;
    }

    call.insertOne(data).then((results) => {
      if (results) {
        console.log(results);
        res.status(201).send({ message: "Response submitted successfully." });
        return;
      }
      res.status(400).send({ error: "Some error occurred." });
      return;
    });
  });

  app.get("/shop", (req, res) => {
    const call = client.db("Milo").collection("Shop");
    call.find({}).toArray(function (err, result) {
      if (err) throw err;
      const val = result.map((data) => {
        return {
          itemId: data._id,
          name: data.name,
          desc: data.desc,
          image: data.image,
          price: data.price,
          quantity: data.quantity,
        };
      });
      res.status(201).json(val);
    });
  });

  app.post("/shop", (req, res) => {
    const data = req.body;
    res.contentType("application/json");
    jwt.verify(
      req.headers.authorization.split(" ")[1],
      "ABCDEFGHIJK",
      function (err, decoded) {
        if (err) {
          res.status(403).json({ error: "Invalid Token" });
          return;
        }
        const call = client.db("Milo").collection("Shop");
        try {
          call.findOne({ _id: ObjectId(data.itemId) }, function (err, result1) {
            if (err) {
              res.status(400).json({ error: err });
              return;
            }
            const call = client.db("Milo").collection("User");
            call.findOne(
              { _id: ObjectId(decoded.user_id) },
              function (err, result3) {
                if (err) {
                  res.status(400).json({ error: err });
                  return;
                }
                if (result3.money - result1.price < 0) {
                  res
                    .status(400)
                    .json({ error: "Insufficient balance for the purchase." });
                  return;
                }
                let c = 0;
                for (var i in result3.shopItems) {
                  if (result3.shopItems[i].id == data.itemId) {
                    c = 1;
                    break;
                  }
                }
                if (c == 1) {
                  res.status(405).json({ error: "Item already purchased" });
                  return;
                }
                const val = [
                  ...result3.shopItems,
                  { id: data.itemId, name: result1.name },
                ];
                call.updateOne(
                  { _id: ObjectId(decoded.user_id) },
                  {
                    $set: {
                      money: result3.money - result1.price,
                      shopItems: val,
                    },
                  },
                  function (err, result4) {
                    if (err) {
                      res.status(400).json({ error: err });
                      return;
                    }
                    const call = client.db("Milo").collection("Shop");
                    call.updateOne(
                      { _id: ObjectId(data.itemId) },
                      { $set: { quantity: result1.quantity - 1 } },
                      function (err, result2) {
                        if (err) {
                          res.status(400).json({ error: err });
                          return;
                        }
                        res
                          .status(201)
                          .json({ message: "Item Purchased Successfully." });
                      }
                    );
                  }
                );
              }
            );
          });
        } catch {
          res.status(403).json({ error: "Invalid Shop Item id." });
          return;
        }
      }
    );
  });

  app.post("/leaderboard", (req, res) => {
    const data = req.body;
    res.contentType("application/json");
    jwt.verify(
      req.headers.authorization.split(" ")[1],
      "ABCDEFGHIJK",
      function (err, decoded) {
        if (err) {
          res.status(403).json({ error: "Invalid Token" });
          return;
        }
        if (
          !(
            data.game == "Tic Tac Toe" ||
            data.game == "Dinosaur" ||
            data.game == "Memory" ||
            data.game == "Maths"
          )
        ) {
          res.status(403).json({ error: "Invalid Game" });
          return;
        }
        const call = client.db("Milo").collection("Game");
        try {
          call.findOne({ name: data.game }, function (err, result1) {
            if (err) {
              res.status(400).json({ error: err });
              return;
            }
            let sorteddata = result1.leaderboard;
            sorteddata.sort((a, b) => {
              if (data.game == "Memory") {
                return a.score - b.score;
              } else {
                return b.score - a.score;
              }
            });
            res.status(201).json(sorteddata);
          });
        } catch {
          res.status(403).json({ error: "Invalid Game" });
          return;
        }
      }
    );
  });

  app.post("/game", (req, res) => {
    const data = req.body;
    res.contentType("application/json");
    jwt.verify(
      req.headers.authorization.split(" ")[1],
      "ABCDEFGHIJK",
      function (err, decoded) {
        if (err) {
          res.status(403).json({ error: "Invalid Token" });
          return;
        }
        console.log(decoded);
        if (
          !(
            data.game == "Tic Tac Toe" ||
            data.game == "Dinosaur" ||
            data.game == "Memory" ||
            data.game == "Maths"
          )
        ) {
          res.status(403).json({ error: "Invalid Game" });
          return;
        }
        if (data.score == null || data.score < 0) {
          res.status(403).json({ error: "Invalid Score" });
          return;
        }
        const call = client.db("Milo").collection("Game");
        try {
          call.findOne({ name: data.game }, function (err, result1) {
            if (err) {
              res.status(400).json({ error: err });
              return;
            }
            const obj = result1.leaderboard.find(
              (o) => o.username === decoded.username
            );
            if (!obj) {
              const datasc = {
                username: decoded.username,
                score: data.score,
                timePlayed: 1,
              };
              const val = [...result1.leaderboard, datasc];
              call.updateOne(
                { name: result1.name },
                {
                  $set: {
                    leaderboard: val,
                  },
                },
                function (err, result4) {
                  if (err) {
                    res.status(400).json({ error: err });
                    return;
                  }
                  res
                    .status(201)
                    .json({ message: "Score Updated Successfully." });
                }
              );
            } else {
              if (
                (obj.score < data.score &&
                  (data.game == "Dinosaur" || data.game == "Maths")) ||
                (obj.score > data.score && data.game == "Memory")
              ) {
                const val = result1.leaderboard.find((o, i) => {
                  if (o.username === decoded.username) {
                    result1.leaderboard[i] = {
                      username: o.username,
                      score: data.score,
                      timePlayed: o.timePlayed + 1,
                    };
                    return true;
                  }
                });
                call.updateOne(
                  { name: result1.name },
                  {
                    $set: {
                      leaderboard: result1.leaderboard,
                    },
                  },
                  function (err, result4) {
                    if (err) {
                      res.status(400).json({ error: err });
                      return;
                    }
                    res
                      .status(201)
                      .json({ message: "Score Updated Successfully." });
                  }
                );
              } else if (
                data.game == "Dinosaur" ||
                data.game == "Maths" ||
                data.game == "Memory"
              ) {
                const val = result1.leaderboard.find((o, i) => {
                  if (o.username === decoded.username) {
                    result1.leaderboard[i] = {
                      username: o.username,
                      score: o.score,
                      timePlayed: o.timePlayed + 1,
                    };
                    return true;
                  }
                });
                call.updateOne(
                  { name: result1.name },
                  {
                    $set: {
                      leaderboard: result1.leaderboard,
                    },
                  },
                  function (err, result4) {
                    if (err) {
                      res.status(400).json({ error: err });
                      return;
                    }
                    res
                      .status(201)
                      .json({ message: "Score Updated Successfully." });
                  }
                );
              } else if (data.game == "Tic Tac Toe") {
                const val = result1.leaderboard.find((o, i) => {
                  if (o.username === decoded.username) {
                    if (data.score) {
                      result1.leaderboard[i] = {
                        username: o.username,
                        score: o.score + 1,
                        timePlayed: o.timePlayed + 1,
                      };
                    } else {
                      result1.leaderboard[i] = {
                        username: o.username,
                        score: o.score,
                        timePlayed: o.timePlayed + 1,
                      };
                    }
                    return true;
                  }
                });
                call.updateOne(
                  { name: result1.name },
                  {
                    $set: {
                      leaderboard: result1.leaderboard,
                    },
                  },
                  function (err, result4) {
                    if (err) {
                      res.status(400).json({ error: err });
                      return;
                    }
                    res
                      .status(201)
                      .json({ message: "Score Updated Successfully." });
                  }
                );
              }
            }
          });
        } catch {
          res.status(403).json({ error: "Invalid Game" });
          return;
        }
      }
    );
  });
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.listen(process.env.PORT || 5000, () => {
  console.log("server ready");
});
