const { Configuration, OpenAIApi } = require("openai");
import { Request, Response, NextFunction, Application } from "express";
const express = require("express");
const cors = require("cors");
const body_parser = require("body-parser");
const axios = require("axios").default;
require("dotenv").config();

//express app
const app: Application = express();

const configuration = new Configuration({
  organization: process.env.ORGANIZATION,
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

//enable all CORS requests
app.use(cors({ origin: true, credentials: true }));

//middleware
app.use(express.json());
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(req.path, req.method);
  next();
});

// routes
app.get("/webhook/whatsapp", (req: Request, res: Response) => {
  const verify_token = process.env.VERIFY_TOKEN;

  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === verify_token) {
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});
app.post("/webhook/whatsapp", (req: Request, res: Response) => {
  if (req.body.object) {
    if (
      req.body.entry &&
      req.body.entry[0].changes &&
      req.body.entry[0].changes[0] &&
      req.body.entry[0].changes[0].value.messages &&
      req.body.entry[0].changes[0].value.messages[0]
    ) {
      let phone_number_id =
        req.body.entry[0].changes[0].value.metadata.phone_number_id;
      let from = req.body.entry[0].changes[0].value.messages[0].from;
      let msg_body = req.body.entry[0].changes[0].value.messages[0].text.body;

      openai
        .createCompletion({
          model: "text-davinci-001",
          prompt: msg_body,
          max_tokens: 100,
          temperature: 0,
        })
        .then((response: any) => {
          console.log(`${response.data.choices[0].text}`);
          axios
            .post(
              `https://graph.facebook.com/v15.0/${phone_number_id}/messages?access_token=${process.env.WHATSAPP_TOKEN}`,
              {
                messaging_product: "whatsapp",
                to: from,
                text: { body: "Ack: " + msg_body },
              }
            )
            .then((response: unknown) => {
              console.log(response);
              res.sendStatus(200);
            })
            .catch((error: unknown) => {
              console.error(error);
            });
        })
        .catch((err: any) => {
          console.log("ERROR Openai");
          console.log(err.message);
        });
    }
  } else {
    res.sendStatus(404);
  }
});

app.listen(process.env.PORT, () =>
  console.log("listening on port", process.env.PORT)
);
