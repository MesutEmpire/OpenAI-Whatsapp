"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _a = require("openai"), Configuration = _a.Configuration, OpenAIApi = _a.OpenAIApi;
var express = require("express");
var cors = require("cors");
var axios = require("axios").default;
require("dotenv").config();
//express app
var app = express();
var configuration = new Configuration({
    organization: process.env.ORGANIZATION,
    apiKey: process.env.OPENAI_API_KEY,
});
var openai = new OpenAIApi(configuration);
//enable all CORS requests
app.use(cors({ origin: true, credentials: true }));
//middleware
app.use(express.json());
app.use(function (req, res, next) {
    console.log(req.path, req.method);
    next();
});
// routes
app.get("/webhook/whatsapp", function (req, res) {
    var verify_token = process.env.VERIFY_TOKEN;
    var mode = req.query["hub.mode"];
    var token = req.query["hub.verify_token"];
    var challenge = req.query["hub.challenge"];
    if (mode && token) {
        if (mode === "subscribe" && token === verify_token) {
            console.log("WEBHOOK_VERIFIED");
            res.status(200).send(challenge);
        }
        else {
            res.sendStatus(403);
        }
    }
});
app.post("/webhook/whatsapp", function (req, res) {
    if (req.body.object) {
        if (req.body.entry &&
            req.body.entry[0].changes &&
            req.body.entry[0].changes[0] &&
            req.body.entry[0].changes[0].value.messages &&
            req.body.entry[0].changes[0].value.messages[0]) {
            var phone_number_id_1 = req.body.entry[0].changes[0].value.metadata.phone_number_id;
            var from_1 = req.body.entry[0].changes[0].value.messages[0].from;
            var msg_body_1 = req.body.entry[0].changes[0].value.messages[0].text.body;
            openai
                .createCompletion({
                model: "text-davinci-001",
                prompt: msg_body_1,
                max_tokens: 100,
                temperature: 0,
            })
                .then(function (response) {
                console.log("".concat(response.data.choices[0].text));
                axios
                    .post("https://graph.facebook.com/v15.0/".concat(phone_number_id_1, "/messages?access_token=").concat(process.env.WHATSAPP_TOKEN), {
                    messaging_product: "whatsapp",
                    to: from_1,
                    text: { body: "Ack: " + msg_body_1 },
                })
                    .then(function (response) {
                    console.log(response);
                    res.sendStatus(200);
                })
                    .catch(function (error) {
                    console.error(error);
                });
            })
                .catch(function (err) {
                console.log("ERROR Openai");
                console.log(err.message);
            });
        }
    }
    else {
        res.sendStatus(404);
    }
});
app.listen(process.env.PORT || 3000, function () {
    return console.log("listening on port", process.env.PORT);
});
//# sourceMappingURL=app.js.map