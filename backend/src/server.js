// PharmaLink backend entry point

const app = require('./app')

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`PharmaLink backend running on http://localhost:${PORT}`)
})