import dotenv from "dotenv"
dotenv.config()

import express from "express"
import cors from "cors"
// import planRouter from "./routes/plan"
import testRouter from "./routes/test"


const app = express()
app.use(cors())
app.use(express.json())

// app.use("/api/plan", planRouter)
app.use("/api/test", testRouter)  // ← only in dev

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))