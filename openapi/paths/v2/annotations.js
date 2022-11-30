const AnnotationsController = require( "../../../lib/controllers/v2/annotations_controller" );

module.exports = sendWrapper => {
  async function POST( req, res ) {
    const results = await AnnotationsController.create( req );
    sendWrapper( req, res, null, results );
  }

  POST.apiDoc = {
    tags: ["Annotations"],
    summary: "Create an annotation",
    security: [{
      userJwtRequired: []
    }],
    requestBody: {
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/AnnotationsCreate"
          }
        }
      }
    },
    responses: {
      200: {
        description: "The annotation just created",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ResultsAnnotations"
            }
          }
        }
      }
    }
  };

  return {
    POST
  };
};
