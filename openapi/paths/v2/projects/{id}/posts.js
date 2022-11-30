const _ = require( "lodash" );
const Joi = require( "joi" );
const transform = require( "../../../../joi_to_openapi_parameter" );
const ProjectsController = require( "../../../../../lib/controllers/v2/projects_controller" );
const projectsPostsSchema = require( "../../../../schema/request/projects_posts" );

module.exports = sendWrapper => {
  async function GET( req, res ) {
    const results = await ProjectsController.posts( req );
    sendWrapper( req, res, null, results );
  }

  const parameters = _.map(
    projectsPostsSchema.$_terms.keys,
    child => transform( child.schema.label( child.key ) )
  );
  parameters.push(
    transform( Joi.string( ).label( "X-HTTP-Method-Override" ).meta( { in: "header" } ) )
  );

  GET.apiDoc = {
    tags: ["Projects"],
    summary: "Fetch project posts",
    security: [{
      userJwtOptional: []
    }],
    parameters,
    responses: {
      200: {
        description: "An array of project posts.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ResultsProjectsPosts"
            }
          }
        }
      }
    }
  };

  return {
    GET
  };
};
