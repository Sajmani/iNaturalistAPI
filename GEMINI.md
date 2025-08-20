# iNaturalistAPI Project Overview

The iNaturalistAPI is a Node.js application that provides a RESTful API for iNaturalist.org. It serves two main API versions: v1 and v2. The v1 API is built using Express.js and defines routes manually, while the v2 API leverages `express-openapi` and an OpenAPI specification for a more structured and maintainable approach. The project uses PostgreSQL and Elasticsearch for data storage, and Redis for caching. It also integrates with New Relic for performance monitoring.

## Building and Running

*   **Prerequisites:** Node.js, npm, access to PostgreSQL, Elasticsearch, and Redis instances.
*   **Installation:**
    ```bash
    npm install
    ```
*   **Configuration:**
    Copy `config_example.js` to `config.js` and fill in the values to connect to Rails, Postgres, and Elasticsearch.
    ```bash
    cp config_example.js config.js
    ```
*   **Running the application:**
    ```bash
    NODE_ENV=development node app.js
    ```
    The application will run on port 4000 by default.

## Testing

*   **Running all tests:**
    ```bash
    npm test
    ```
*   **Filtering tests by pattern:**
    ```bash
    NODE_ENV=test ./node_modules/mocha/bin/_mocha --recursive --fgrep observations
    ```
*   **Running tests with Docker:**
    ```bash
    docker compose -f docker-compose.test.yml up -d
    ```
    To rebuild the Docker image after code changes:
    ```bash
    docker compose -f docker-compose.test.yml build
    ```

## Linting

*   **Run ESLint:**
    ```bash
    npm run eslint
    ```

## Development Conventions

*   **API Versioning:** The project maintains two API versions (v1 and v2), with v2 moving towards an OpenAPI-driven approach.
*   **Code Style:** ESLint is used to enforce code style and identify syntax errors.
*   **Testing:** Mocha is used for testing, with `nyc` for code coverage. Tests can be run locally or via Docker.
*   **Documentation:** API documentation is generated using Swagger/OpenAPI.
