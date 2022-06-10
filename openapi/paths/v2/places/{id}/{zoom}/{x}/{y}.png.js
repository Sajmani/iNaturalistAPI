const _ = require( "lodash" );
const Joi = require( "joi" );
const transform = require( "../../../../../../joi_to_openapi_parameter" );
const observationsSearchSchema = require( "../../../../../../schema/request/observations_search" );
const { tilePathParams } = require( "../../../../../../common_parameters" );

const inheritdObsSearchParams = _.filter(
  observationsSearchSchema.$_terms.keys, p => !_.includes( ["id", "fields"], p.key )
);
const transformedObsSearchParams = _.map( inheritdObsSearchParams, p => (
  transform( p.schema.label( p.key ) )
) );

module.exports = sendWrapper => {
  async function GET( req, res ) {
    req.params.style = "places";
    req.params.format = "png";
    req.params.place_id = req.params.id;
    sendWrapper( req, res );
  }

  GET.apiDoc = {
    tags: ["Polygon Tiles"],
    summary: "Place Tiles",
    security: [{
      userJwtOptional: []
    }],
    parameters: [
      transform( Joi.string( ).label( "id" ).meta( { in: "path" } ).required( ) )
    ].concat( tilePathParams ).concat( transformedObsSearchParams ),
    responses: {
      200: {
        description: "Returns place tiles.",
        content: {
          "image/png": {
            schema: {
              type: "string",
              format: "binary"
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
