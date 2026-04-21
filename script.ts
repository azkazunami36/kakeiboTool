addEventListener("load", async () => {
    new GenreEditer(new Kakeibo());
});

interface Item {
    date: number;
    price: number;
    genreNo: number;
    alternative?: boolean;
    memo: string;
}

interface Genre {
    no: number;
    name: string;
    alternativeName?: string;
    memo: ""
};

/**
 * 現在位置を特定します。最初のうちはクラスが含まれているかを確認し、一番最後ではIDと照合します。一致したらtrueを返します。
 */
function positionCheck(elememt: HTMLElement, parent: string[]) {
    for (const name of parent) {
        if (name === parent[parent.length - 1] && elememt.id === name) return true;
        else if (elememt.classList.contains(name) && elememt.parentElement) elememt = elememt.parentElement
        else return false;
    }
    return false;
}

function getPosition(element: HTMLElement) {
    try {
        return Array.prototype.indexOf.call(element.parentElement?.children, element);
    } catch {
        return -1;
    }
}

class Kakeibo {
    genre: Genre[] = [];
    /**
     * 現在扱っているデータです。DOMに表示されているものと完全同期する形です。refreshするたびに正常化する考えです。
     */
    items: Record<string, Item[]> = {};
    prevoiusdate = 0;
    constructor() {
        (async () => {
            try {
                const res = await fetch("genre.json");
                const json = JSON.parse(await res.text());
                this.genre = json;
            } catch { }
            const yearel = document.getElementById("year") as HTMLInputElement;
            const monthel = document.getElementById("month") as HTMLInputElement;
            const ref = () => {
                const year = Math.floor(Number(yearel.value));
                const month = Math.floor(Number(monthel.value));
                this.refreshView(year, month)
            }
            yearel.addEventListener("input", ref);
            monthel.addEventListener("input", ref);
            const add = document.getElementById("add") as HTMLInputElement;
            const create = () => {
                const date = Number(prompt("追加する項目の目的の日付を入力してください。例: " + (new Date()).getDate(), String(this.prevoiusdate)));
                if (Number.isNaN(date) || date <= 0) return alert("その入力値は無効です。");
                this.prevoiusdate = date;
                let dateelement: HTMLDivElement | undefined;
                const datelist = document.getElementById("datelist") as HTMLDivElement;
                for (const el of datelist.children) {
                    const eldate = Number((el as HTMLDivElement).dataset.date);
                    if (date === eldate) dateelement = el as HTMLDivElement;
                }
                if (!dateelement) {
                    dateelement = this.createDateItem(date);
                    datelist.insertBefore(dateelement, datelist.firstChild);
                }
                if (!this.items[date]) this.items[date] = [];
                this.items[date].push({ genreNo: 0, memo: "", alternative: false, price: 0, date: date });
                const itemlist = dateelement.getElementsByClassName("itemlist")[0] as HTMLDivElement;
                const editItem = this.createEditItem(this.items[date][this.items[date].length - 1]);
                itemlist.appendChild(editItem);
                const price = editItem.getElementsByClassName("price")[0] as HTMLInputElement;
                price.focus();
            }
            add.addEventListener("click", create);
            addEventListener("keypress", e => {
                switch (e.key.toLowerCase()) {
                    case "n": {
                        e.preventDefault();
                        create();
                    }
                    case "enter": {
                        const ta = (e.target as HTMLElement).parentElement?.parentElement;
                        if (!e.shiftKey && ta && positionCheck(ta, ["item", "itemlist", "dateitem", "datelist"])) save(e.target as HTMLElement);
                    }
                }
                console.log(e.key)
            });
            const che = async (e: Event) => {
                const target = e.target as HTMLElement;
                if (positionCheck(target, ["edit", "right", "item", "itemlist", "dateitem", "datelist"])) {
                    console.log("編集ボタンがクリックされた！");
                    const item = target.parentElement?.parentElement;
                    const dateitem = item?.parentElement?.parentElement;
                    console.log(item, dateitem);
                    if (!item || !dateitem) return;
                    const itemPosition = getPosition(item);
                    const date = Number(dateitem.dataset.date);
                    item.insertAdjacentElement("afterend", this.createEditItem(this.items[date][itemPosition]));
                    item.remove();
                }
                if (positionCheck(target, ["done", "right", "item", "itemlist", "dateitem", "datelist"])) {
                    console.log("完了ボタンがクリックされた！");
                    await save(target);
                }
                if (positionCheck(target, ["delete", "right", "item", "itemlist", "dateitem", "datelist"])) {
                    console.log("削除ボタンがクリックされた！");
                    const item = target.parentElement?.parentElement;
                    const dateitem = item?.parentElement?.parentElement;
                    console.log(item, dateitem);
                    if (!item || !dateitem) return;
                    const itemPosition = getPosition(item);
                    const date = Number(dateitem.dataset.date);
                    this.items[date].splice(itemPosition, 1);
                    await this.easySave();
                }
            };
            const save = async (target: HTMLElement) => {
                const item = target.parentElement?.parentElement;
                const dateitem = item?.parentElement?.parentElement;
                console.log(item, dateitem);
                if (!item || !dateitem) return;
                const itemPosition = getPosition(item);
                const date = Number(dateitem.dataset.date);
                const changedItem: Item | undefined = (() => {
                    try {
                        const changedateel = item.getElementsByClassName("date")[0] as HTMLInputElement;
                        const cdate = Number(changedateel.value);
                        if (Number.isNaN(cdate)) return;
                        const changepriceel = item.getElementsByClassName("price")[0] as HTMLInputElement;
                        const cprice = Number(changepriceel.value);
                        if (Number.isNaN(cprice)) return;
                        const changegenre = item.getElementsByClassName("genre")[0] as HTMLSelectElement;
                        const cgenreid = changegenre.options[changegenre.selectedIndex].value;
                        let genreid = cgenreid;
                        let alternative = false;
                        if (cgenreid[cgenreid.length - 1] === "a") {
                            alternative = true;
                            genreid = cgenreid.slice(0, cgenreid.length - 1);
                            console.log(cgenreid, genreid);
                        }
                        const genreno = Number(genreid);
                        if (Number.isNaN(genreno)) return;
                        const changememo = item.getElementsByClassName("memo")[0] as HTMLTextAreaElement;
                        const cmemo = changememo.value;
                        return {
                            price: cprice,
                            genreNo: genreno,
                            memo: cmemo,
                            date: cdate,
                            alternative
                        }
                    } catch { }
                })();
                if (!changedItem) {
                    alert("正しい形式で入力できていないようです。");
                    return;
                }
                this.items[date][itemPosition] = changedItem;
                await this.easySave();
            }
            addEventListener("click", che)
            const now = new Date();
            await this.refreshView(now.getFullYear(), now.getMonth() + 1);
        })();
    }

    /**
     * 隅々まで再描画します。
     */
    async refreshView(year: number, month: number) {
        const scrollTop = document.body.scrollTop;
        const data = Number.isNaN(year) || Number.isNaN(month) || year < 1000 || month <= 0 || month >= 13 ? [] : await this.getInfo(year, month);
        const yearel = document.getElementById("year") as HTMLInputElement;
        const monthel = document.getElementById("month") as HTMLInputElement;
        const genreInfo = document.getElementById("genreInfo") as HTMLDivElement;
        const datelist = document.getElementById("datelist") as HTMLDivElement;
        if (!yearel || !monthel || !genreInfo) return;
        yearel.value = String(year);
        monthel.value = String(month);
        genreInfo.innerHTML = "";

        const genreInfoTitle = document.createElement("h2");
        genreInfoTitle.innerText = "ジャンルごとの金額概要";
        genreInfo.appendChild(genreInfoTitle);

        const items: Record<string, Item[]> = {};
        for (const itm of data) {
            if (items[String(itm.date)] === undefined) items[String(itm.date)] = [];
            items[String(itm.date)].push(itm);
        }
        this.items = items;
        datelist.innerHTML = "";
        const genreCalc: Record<string, { normal: number; alternative: number; }> = {};
        for (const date of Object.keys(items)) {
            const item = items[date];
            const dateitem = this.createDateItem(Number(date));
            const itemlist = dateitem.getElementsByClassName("itemlist")[0];
            for (const itm of item) {
                itemlist.appendChild(this.createItem(itm));
                const genreno = String(itm.genreNo);
                if (!genreCalc[genreno]) genreCalc[genreno] = { normal: 0, alternative: 0 };
                if (itm.alternative) genreCalc[genreno].alternative += itm.price;
                genreCalc[genreno].normal += itm.alternative ? -itm.price : itm.price
            }
            datelist.appendChild(dateitem);
        }

        for (let i = 0; i < this.genre.length; i++) {
            const genre = this.genre[i];
            const genreprice = genreCalc[String(genre.no)] || { normal: 0, alternative: 0 };
            const item = this.createGenreItem(genre);
            const normal = item.getElementsByClassName("genreValue")[0] as HTMLDivElement;
            const alternative = item.getElementsByClassName("genreValue")[1] as HTMLDivElement;
            normal.innerText = String(genreprice.normal);
            if (alternative) alternative.innerText = String(genreprice.alternative);
            genreInfo.appendChild(item);
        }
    document.body.scrollTo({top: scrollTop});
    }

    createDateItem(date: number) {
        const dateitem = document.createElement("div");
        dateitem.classList.add("dateitem");
        dateitem.innerHTML = `
            <div class="dateview">
                <h2></h2>
            </div>
            <div class="itemlist"></div>`;
        const dateview = dateitem.getElementsByTagName("h2")[0];
        dateview.innerText = date + "日";
        dateitem.dataset.date = String(date);
        return dateitem;
    }
    createGenreItem(genre: Genre) {
        const genreItem = document.createElement("div");
        genreItem.classList.add("genreItem");
        genreItem.innerHTML = `
            <div class="genreName"></div>
            <div class="value">
                <div class="genreValue"></div>
                <div class="typo">円</div>
            </div>`.repeat(genre.alternativeName ? 2 : 1);
        const normal = genreItem.getElementsByClassName("genreName")[0] as HTMLDivElement;
        normal.innerText = genre.name;
        if (genre.alternativeName) {
            const alternative = genreItem.getElementsByClassName("genreName")[1] as HTMLDivElement;
            alternative.innerText = genre.alternativeName;
        }
        return genreItem;
    }

    createItem(data: Item) {
        const item = document.createElement("div");
        item.classList.add("item");
        item.innerHTML = `
        <div class="left">
            <div class="price"></div>
            <div class="typo">円</div>
            <div class="genre"></div>
            <div class="memo"></div>
        </div>
        <div class="right">
            <button type="button" class="edit">✏️</button>
            <button type="button" class="delete">🗑️</button>
        </div>`;

        const price = item.getElementsByClassName("price")[0] as HTMLDivElement;
        const genre = item.getElementsByClassName("genre")[0] as HTMLDivElement;
        const memo = item.getElementsByClassName("memo")[0] as HTMLDivElement;
        price.innerText = String(data.price);
        genre.innerText = this.getGenreName(data.genreNo, data.alternative) || "!!Not Valid Genre ID!!";
        memo.innerText = data.memo;

        return item;
    }
    createEditItem(data: Item) {
        const item = document.createElement("div");
        item.classList.add("item");
        item.innerHTML = `
        <div class="left">
            <input class="date" type="text" value="1">
            <div class="typo">日</div>
            <input class="price" type="text" value="300">
            <div class="typo">円</div>
            <select class="genre"></select>
            <textarea class="memo">卵と牛乳</textarea>
        </div>
        <div class="right">
            <button type="button" class="done">✅</button>
            <button type="button" class="delete">🗑️</button>
        </div>`;

        const date = item.getElementsByClassName("date")[0] as HTMLInputElement;
        const price = item.getElementsByClassName("price")[0] as HTMLInputElement;
        const genre = item.getElementsByClassName("genre")[0] as HTMLSelectElement;
        const memo = item.getElementsByClassName("memo")[0] as HTMLTextAreaElement;
        date.value = String(data.date);
        price.value = String(data.price);
        for (const genredata of this.genre) {
            const option = document.createElement("option");
            if (genredata.no === data.genreNo && !data.alternative) option.selected = true;
            option.value = String(genredata.no);
            option.innerText = genredata.name;
            genre.appendChild(option);
            if (genredata.alternativeName) {
                const option = document.createElement("option");
                if (genredata.no === data.genreNo && data.alternative) option.selected = true;
                option.value = String(genredata.no) + "a";
                option.innerText = genredata.alternativeName;
                genre.appendChild(option);
            }
        }

        memo.value = data.memo;

        return item;
    }
    getGenreName(no: number, alternativeIs: boolean = false) {
        const data = this.genre.find(ge => ge.no === no);
        return alternativeIs ? data?.alternativeName : data?.name;
    }

    /** DOMの年月を取得した上で、クラスに登録された情報を元にデータを保存し、保存されたデータを再展開します。 */
    async easySave() {
        const yearel = document.getElementById("year") as HTMLInputElement;
        const monthel = document.getElementById("month") as HTMLInputElement;
        const year = Number(yearel.value);
        const month = Number(monthel.value);
        if (Number.isNaN(year) || Number.isNaN(month)) return;
        const items = [];
        for (const date of Object.keys(this.items)) {
            items.push(...this.items[date]);
        }
        await this.saveInfo(year, month, items);
        await this.refreshView(year, month);
    }

    async getInfo(year: number, month: number): Promise<Item[]> {
        try {
            const res = await fetch(String(year).padStart(4, "0") + "-" + String(month).padStart(2, "0") + ".jsonl", {
                method: "get"
            });
            const restext = await res.text();
            const resjson: Item[] = [];
            for (const col of restext.split("\n")) {
                try {
                    resjson.push(JSON.parse(col));
                } catch { }
            }
            return resjson;
        } catch {
            return [];
        }
    }

    async saveInfo(year: number, month: number, body: Item[]) {
        let saveText = "";
        for (const json of body) {
            saveText += JSON.stringify(json) + "\n";
        }
        await fetch(String(year).padStart(4, "0") + "-" + String(month).padStart(2, "0") + ".jsonl", {
            method: "post",
            body: saveText
        });
    }
}

class GenreEditer {
    kakeibo: Kakeibo;
    constructor(kakeibo: Kakeibo) {
        this.kakeibo = kakeibo;
        const genreEditPopup = document.getElementById("genreEditPopup") as HTMLDivElement;
        const close = genreEditPopup.getElementsByClassName("close")[0] as HTMLButtonElement;
        close.addEventListener("click", () => {
            genreEditPopup.style.display = "none";
        })
    }
}

