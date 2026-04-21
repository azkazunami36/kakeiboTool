import express from "express";
import fs from "fs";
import path from "path";

const app = express();

app.get("/", (req, res) => { res.end(fs.readFileSync("index.html")); });
app.get("/index.html", (req, res) => { res.end(fs.readFileSync("index.html")); });
app.get("/style.css", (req, res) => { res.end(fs.readFileSync("style.css")); });
app.get("/script.js", (req, res) => { res.sendFile(path.resolve("./script.js")); });
app.get("/genre.json", (req, res) => { res.end(fs.readFileSync("genre.json")); });
app.get(/^\/([0-9]{4}-[0-9]{2})\.jsonl$/, (req, res) => {
    try {
        const data = fs.readFileSync(req.url.slice(1, req.url.length));
        res.end(data);
    } catch {
        res.status(404);
        res.end();
    }
});

app.post("genre.json", (req, res) => {
    let data = "";
    req.on("data", chunk => { data += chunk; });
    req.on("end", () => {
        fs.writeFileSync("genre-writing.jsonl", data);
        fs.renameSync("genre-writing.jsonl", "genre.jsonl");
        res.end();
    })
});
app.post(/^\/([0-9]{4}-[0-9]{2})\.jsonl$/, (req, res) => {
    let data = "";
    req.on("data", chunk => { data += chunk; });
    req.on("end", () => {
        fs.writeFileSync(req.url.slice(1, req.url.length) + "-writeing.json", data);
        fs.renameSync(req.url.slice(1, req.url.length) + "-writeing.json", req.url.slice(1, req.url.length));
        res.end();
    })
});

app.listen(3000);
