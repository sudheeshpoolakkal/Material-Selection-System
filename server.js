// One production entry point for the API and built React workspace.
process.env.PORT = process.env.PORT || "3000";
const app = require("./server/server");
require("./server/services/catalog")
  .ready.then(() =>
    app.listen(
      Number(process.env.PORT),
      process.env.STARBASE_HOST || process.env.MATERIA_HOST || "127.0.0.1",
      () => console.log(`Starbase: http://localhost:${process.env.PORT}`),
    ),
  )
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
