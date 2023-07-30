import express from "express"
import { comicsServices } from "./services";
import cors from "cors"


const app = express();
const PORT = 4000

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allStatus = ['all', 'completed', 'updating'];

const main = async () => {


    // Routes
    app.get("/comics/new", async (req, res) => {
        try {
            const { query } = req;
            const status = query.status ? query.status : 'all';
            const page = query.page ? Number(query.page) : 1;

            //@ts-ignore
            if(!allStatus.includes(status)) throw Error('Invalid status');

            //@ts-ignore
            const comics = await comicsServices.getComicsNew(status, page);
            
            return res.json({
                success: true,
                message: "Get Comics Successful",
                comics: comics || null
            })
        } catch (error) {
            return res.status(200).json({
                success: false,
                message: "Get Comics Error",
                error: error
            })
        }
    })



    app.get("/", (_req, res) => {
        res.send("BY HOANGBAO")
    })

    app.listen(PORT, () => {
        console.log(`Server Started On PORT: ${PORT}`);
    })

}

main().catch(error => console.log(error))