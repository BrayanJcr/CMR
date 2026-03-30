const swaggerJsdoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')

const options = {
    definition: {
        openapi: "3.1.0",
        info: {
            title: "ChatWA Express API with Swagger",
            version: "0.1.0",
            description:
                "This is a project to interact with WhatsApp Client",
            contact: {
                name: "Ansoli Espinoza",
                url: "https://ansoli.dev",
                email: "anubarrado@gmail.com",
            },
        },
        servers: [
            {
                url: "http://localhost:3000",
            },
        ],
    },
    apis: ["./routes/*.js"],
};

const specs = swaggerJsdoc(options)

module.exports = (app) => {
    app.use(
        '/api-docs',
        swaggerUi.serve,
        swaggerUi.setup(specs, { explorer: true })
    )
}