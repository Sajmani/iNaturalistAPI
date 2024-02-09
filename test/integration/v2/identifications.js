const _ = require( "lodash" );
const { expect } = require( "chai" );
const request = require( "supertest" );
const jwt = require( "jsonwebtoken" );
const nock = require( "nock" );
const fs = require( "fs" );
const config = require( "../../../config" );

const fixtures = JSON.parse( fs.readFileSync( "schema/fixtures.js" ) );

describe( "Identifications", ( ) => {
  describe( "create", ( ) => {
    const token = jwt.sign(
      { user_id: 333 },
      config.jwtSecret || "secret",
      { algorithm: "HS512" }
    );
    const ident = fixtures.postgresql.identifications[0];
    const obs = _.find( fixtures.postgresql.observations, o => o.id === ident.observation_id );
    it( "returns JSON", function ( done ) {
      nock( "http://localhost:3000" )
        .post( "/identifications" )
        .reply( 200, ident );
      request( this.app ).post( "/v2/identifications" )
        .set( "Authorization", token )
        .set( "Content-Type", "application/json" )
        // it doesn't really matter what we post since we're just stubbing the
        // Rails app to return obs 6 to load from the ES index
        .send( {
          identification: {
            taxon_id: ident.taxon_id,
            observation_id: obs.uuid
          }
        } )
        .expect( 200 )
        .expect( res => {
          const resIdent = res.body.results[0];
          expect( resIdent.id ).to.eq( ident.id );
        } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );
  } );

  describe( "identifiers", ( ) => {
    it( "return JSON", function ( done ) {
      request( this.app ).get( "/v2/identifications/identifiers" )
        .expect( 200 )
        .expect( res => {
          expect( res.body.results.length ).to.be.greaterThan( 0 );
        } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );
    it( "never returns email or IP for user in identification", function ( done ) {
      request( this.app ).get( "/v2/identifications/identifiers?per_page=100&fields=all" )
        .expect( res => {
          expect( res.body.page ).to.eq( 1 );
          const record = _.find( res.body.results, u => u.user_id === 2023092501 );
          expect( record ).not.to.be.undefined;
          expect( record.user ).not.to.be.undefined;
          expect( record.user.id ).eq( 2023092501 );
          expect( record.user.email ).to.be.undefined;
          expect( record.user.last_ip ).to.be.undefined;
        } ).expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );
  } );

  describe( "update", ( ) => {
    const token = jwt.sign(
      { user_id: 333 },
      config.jwtSecret || "secret",
      { algorithm: "HS512" }
    );
    const ident = fixtures.elasticsearch.identifications.identification[0];
    it( "returns JSON", function ( done ) {
      nock( "http://localhost:3000" )
        .put( `/identifications/${ident.uuid}` )
        .reply( 200, ident );
      request( this.app ).put( `/v2/identifications/${ident.uuid}` )
        .set( "Authorization", token )
        .set( "Content-Type", "application/json" )
        .send( {
          identification: {
            body: "this is an updated body"
          }
        } )
        .expect( 200 )
        .expect( res => {
          const resIdent = res.body.results[0];
          expect( resIdent.uuid ).to.eq( ident.uuid );
        } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );

    it( "bails without an identification in the request body", function ( done ) {
      nock( "http://localhost:3000" )
        .put( `/identifications/${ident.uuid}` )
        .reply( 200, ident );
      request( this.app ).put( `/v2/identifications/${ident.uuid}` )
        .set( "Authorization", token )
        .set( "Content-Type", "application/json" )
        .send( {
          body: "this is an updated body"
        } )
        .expect( 422, done );
    } );
  } );

  describe( "delete", ( ) => {
    const token = jwt.sign(
      { user_id: 333 },
      config.jwtSecret || "secret",
      { algorithm: "HS512" }
    );
    const ident = fixtures.elasticsearch.identifications.identification[0];
    it( "returns 200", function ( done ) {
      nock( "http://localhost:3000" )
        .delete( `/identifications/${ident.uuid}?delete=true` )
        .reply( 200 );
      request( this.app ).delete( `/v2/identifications/${ident.uuid}` )
        .set( "Authorization", token )
        .set( "Content-Type", "application/json" )
        .expect( 200, done );
    } );
  } );

  describe( "recentTaxa", ( ) => {
    it( "return JSON", function ( done ) {
      request( this.app ).get( "/v2/identifications/recent_taxa?taxon_id=1" )
        .expect( 200 )
        .expect( res => {
          expect( res.body.results.length ).to.be.greaterThan( 0 );
        } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );
  } );
} );
