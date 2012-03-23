var	DATA_URL = "http://www.khanacademy.org/api/v1/user/exercises";
//var	DATA_URL = "http://localhost:8888/api/v1/user/exercises";
//var	DATA_URL = "exercises.json";
//var	DATA_URL = "foo.json";

var X_SPACING = 65;
var Y_SPACING = 73;
var LABEL_WIDTH = 60;

var exercise = {};
var selected = [];
var raphael;
var initialModel;

var minH = 0;
var minV = 0;

function updateCanvasSize() {
	minV = Math.min.apply( Math, jQuery.map( exercise, function( ex ) { return ex.v } ) ) - 1;
	minH = Math.min.apply( Math, jQuery.map( exercise, function( ex ) { return ex.h } ) ) - 1;
	var maxV = Math.max.apply( Math, jQuery.map( exercise, function( ex ) { return ex.v } ) ) + 1;
	var maxH = Math.max.apply( Math, jQuery.map( exercise, function( ex ) { return ex.h } ) ) + 1;
	raphael.setSize( ( maxH - minH + 2 ) * X_SPACING, ( maxV - minV + 2 ) * Y_SPACING );
}

function updateForm( exerciseName ) {
	if ( exerciseName !== null ) {
		console.log( exercise[ exerciseName ] );
		selected = [ exerciseName ];
		jQuery( ".exercise-properties" ).show();
		jQuery( "#ex-title" ).html( exercise[ exerciseName ].display_name );
		if ( exercise[ exerciseName ].live ) {
			jQuery( "#live_yes" ).attr( "checked", true );
		} else {
			jQuery( "#live_no" ).attr( "checked", true );
		}
		jQuery( "input[name=short_display_name]" ).val( exercise[ exerciseName ].short_display_name );
		jQuery( "#h_position" ).text( exercise[ exerciseName ].v );
		jQuery( "#v_position" ).text( exercise[ exerciseName ].h );
		jQuery( "#prereqs-container" ).empty();
		jQuery.each( exercise[ exerciseName ].incoming, function( n, prereq ) {
			jQuery( "<div>" ).html( prereq[ 0 ] + ' (<a href="#" onclick="deletePrereq(&quot;' + prereq[ 0 ] + '&quot;);return false;">remove</a>)' ).appendTo( jQuery( "#prereqs-container" ) );
		});
		jQuery( "#covers-container" ).empty();
		jQuery.each( exercise[ exerciseName ].covers, function( n, cover ) {
			jQuery( "<div>" ).html( cover + ' (<a href="#" onclick="deleteCover(&quot;' + cover + '&quot;);return false;">remove</a>)' ).appendTo( jQuery( "#covers-container" ) );
		});
	} else {
		jQuery( "#ex-title" ).html( "" );
		jQuery( ".exercise-properties" ).hide();
	}
}

function addPath( src, dst ) {
	var set = raphael.set();
	set.push( raphael.path( Raphael.format( "M{0},{1}L{2},{3}",
			( exercise[ src ].v - minV ) * X_SPACING + ( LABEL_WIDTH / 2 ),
			( exercise[ src ].h - minH ) * Y_SPACING + 13,
			( exercise[ dst ].v - minV ) * X_SPACING + ( LABEL_WIDTH / 2 ),
			( exercise[ dst ].h - minH ) * Y_SPACING + 13
		) ).attr({
			"stroke-width": 2,
			"stroke": "#999"
		})
	);
	exercise[ dst ].incoming.push([ src, set ]);
	exercise[ src ].outgoing.push([ dst, set ]);
}

function delPath( src, dst ) {
	var newOutgoing = jQuery.map( exercise[ src ].outgoing, function( ex ) { if ( ex[0] !== dst ) return [ ex ]; } );
	var newIncoming = jQuery.map( exercise[ dst ].incoming, function( ex ) { if ( ex[0] !== src ) return [ ex ]; } );
	var outElement = jQuery.map( exercise[ src ].outgoing, function( ex ) { if ( ex[0] === dst ) return ex[1]; } );
	var inElement = jQuery.map( exercise[ dst ].incoming, function( ex ) { if ( ex[0] === src ) return ex[1]; } );
	outElement[0].remove();
	inElement[0].remove();
	exercise[ src ].outgoing = newOutgoing;
	exercise[ dst ].incoming = newIncoming;
}


jQuery( document ).ready( function() {
	// Make the map drag-scrollable
	jQuery( "#map" ).bind( "mousedown", function( event ) {
		if( jQuery( event.target ).hasClass("exercise") ) {
			return;
		}
		var startX = event.pageX - parseInt( jQuery( "#map" ).css( "margin-left" ), 10 );
		var startY = event.pageY - parseInt( jQuery( "#map" ).css( "margin-top" ), 10 );
		var moved = false;

		jQuery( document ).bind( "mousemove mouseup", function( event ) {
			jQuery( "#map" ).css({
				"margin-top": event.pageY - startY,
				"margin-left": event.pageX - startX
			});
			if ( event.type === "mouseup" ) {
				jQuery( document ).unbind( "mousemove mouseup" );
				if ( !moved ) {
					updateForm( null );
					jQuery( ".exercise-label" ).removeClass( "exercise-selected" );
					jQuery( "img.exercise" ).attr({ src: "node-not-started.png" });
					selected = [];
				}
			} else {
				moved = true;
			}
			return false;
		});
		return false;
	});

	raphael = Raphael( jQuery( "#map" )[0] );


	jQuery.ajax({
		url: DATA_URL,
		type: "GET",
		dataType: "json",
		success: function( data ) {
			initialModel = data;
			jQuery.each( data, function( n, ex ) {
				if ( ex.exercise_model.summative ) {
					return;
				}
				exercise[ ex.exercise ] = {
					n: n,
					display_name: ex.exercise_model.display_name,
					short_display_name: ex.exercise_model.short_display_name,
					live: ex.exercise_model.live,
					v: ex.exercise_model.v_position,
					h: ex.exercise_model.h_position,
					covers: ex.exercise_model.covers,
					incoming: [],
					outgoing: []
				};
				jQuery( "<option>" ).attr( "value", ex.exercise ).text( ex.exercise_model.display_name ).appendTo( jQuery( "#add-prereq" ) );
				jQuery( "<option>" ).attr( "value", ex.exercise ).text( ex.exercise_model.display_name ).appendTo( jQuery( "#add-cover" ) );
			});

			updateCanvasSize();


			jQuery.each( data, function( n, ex ) {
				if ( ex.exercise_model.summative ) {
					return;
				}
				jQuery.each( ex.exercise_model.prerequisites, function( n, prereq ) {
					addPath( prereq, ex.exercise );
				});
				var newDiv = jQuery( "<div>" ).appendTo( jQuery( "#map" ) );
				newDiv.addClass( "exercise" );
				newDiv.css({
					"left": ( ( ex.exercise_model.v_position - minV ) * X_SPACING ) + "px",
					"top": ( ( ex.exercise_model.h_position - minH ) * Y_SPACING ) + "px"
				});
				jQuery( "<img>" ).attr({
					src: "node-not-started.png",
					width: 26,
					height: 26
				}).addClass( "exercise" ).bind( "dragstart", function( event ) { event.preventDefault(); } ).appendTo( newDiv )
				jQuery( "<div>" ).addClass( "exercise exercise-label" ).text( ex.exercise_model.display_name ).appendTo( newDiv );

				newDiv.data( "exercise", exercise[ ex.exercise ] );
				newDiv.bind( "mousedown", function( event ) {
					jQuery( ".exercise" ).zIndex( 0 );
					newDiv.zIndex( 1 );
					if ( event.shiftKey ) {
						updateForm( null );
						selected.push( ex.exercise );
						newDiv.find( ".exercise-label" ).addClass( "exercise-selected" );
						newDiv.find( "img" ).attr({ src: "node-complete.png" });
					} else if ( selected.length <= 1 ) {
						jQuery( ".exercise-label" ).removeClass( "exercise-selected" );
						newDiv.find( ".exercise-label" ).addClass( "exercise-selected" );
						jQuery( "img.exercise" ).attr({ src: "node-not-started.png" });
						newDiv.find( "img" ).attr({ src: "node-complete.png" });
						updateForm( ex.exercise );
					}
				});
				exercise[ ex.exercise ].div = newDiv;

				var hStart, vStart;

				newDiv.draggable({
					start: function( event, ui ) {
						hStart = exercise[ ex.exercise ].h;
						vStart = exercise[ ex.exercise ].v;
					},
					drag: function( event, ui ) {
						exercise[ ex.exercise ].h = ui.position.top / Y_SPACING + minH;
						exercise[ ex.exercise ].v = ui.position.left / X_SPACING + minV;
						jQuery.each( exercise[ ex.exercise ].incoming, function( n, incoming ) {
							delPath( incoming[0], ex.exercise );
							addPath( incoming[0], ex.exercise );
						});
						jQuery.each( exercise[ ex.exercise ].outgoing, function( n, outgoing ) {
							delPath( ex.exercise, outgoing[0] );
							addPath( ex.exercise, outgoing[0] );
						});
					},
					stop: function( event, ui ) {
						exercise[ ex.exercise ].h = Math.round( ui.position.top / Y_SPACING + minH );
						exercise[ ex.exercise ].v = Math.round( ui.position.left / X_SPACING + minV );

						var hDelta = exercise[ ex.exercise ].h - hStart;
						var vDelta = exercise[ ex.exercise ].v - vStart;
						jQuery.each( selected, function( n, exid ) {
							if ( exid !== ex.exercise ) {
								exercise[ exid ].h += hDelta;
								exercise[ exid ].v += vDelta;
							}
						});

						jQuery.each( selected, function( n, exid ) {
							jQuery.each( exercise[ exid ].incoming, function( n, incoming ) {
								delPath( incoming[0], exid );
								addPath( incoming[0], exid );
							});
							jQuery.each( exercise[ exid ].outgoing, function( n, outgoing ) {
								delPath( exid, outgoing[0] );
								addPath( exid, outgoing[0] );
							});
							exercise[ exid ].div.css({
								"left": ( ( exercise[ exid ].v - minV ) * X_SPACING ) + "px",
								"top": ( ( exercise[ exid ].h - minH ) * Y_SPACING ) + "px"
							});
						});
						jQuery( "#h_position" ).text( exercise[ ex.exercise ].v );
						jQuery( "#v_position" ).text( exercise[ ex.exercise ].h );
					}
				});
			});

		}
	});

	var changeWindow = jQuery( "<div>" ).dialog({
		autoOpen: false,
		modal: true,
		title: "Exercise changes",
		height: 700,
		width: 500
	});
	var tabs = jQuery( "<ul>" ).html( "<li><a href='#change-list'>Summary</a></li><li><a href='#export-tab'>Export</a></li>" ).appendTo( changeWindow );
	var changeList = jQuery( "<div>" ).attr( "id", "change-list" ).appendTo( changeWindow );
	var exportTab = jQuery( "<div>" ).attr( "id", "export-tab" ).css( "height", "90%" ).appendTo( changeWindow );
	changeWindow.tabs();

	jQuery( "button#show-changes" ).click( function() {
		changeList.empty();
		var newModel = jQuery.extend( {}, initialModel );
		jQuery.each( exercise, function( n, ex ) {
			var changes = "";
			if ( initialModel[ ex.n ].exercise_model.v_position !== ex.v ) {
				changes = changes + "<br /> • Horizontal position: " + initialModel[ ex.n ].exercise_model.v_position + " -> " + ex.v;
				newModel[ ex.n ].exercise_model.v_position = ex.v;
			}
			if ( initialModel[ ex.n ].exercise_model.h_position !== ex.h ) {
				changes = changes + "<br /> • Vertical position: " + initialModel[ ex.n ].exercise_model.h_position + " -> " + ex.h;
				newModel[ ex.n ].exercise_model.h_position = ex.h;
			}
			jQuery.each( initialModel[ ex.n ].exercise_model.prerequisites, function( n, init_prereq ) {
				if ( jQuery.map( ex.incoming, function( prereq ) { if ( init_prereq === prereq[ 0 ] ) { return init_prereq; } }).length === 0 ) {
					changes = changes + "<br /> • Remove prerequsite: " + init_prereq;
				}
			});
			jQuery.each( ex.incoming, function( n, prereq ) {
				if ( jQuery.map( initialModel[ ex.n ].exercise_model.prerequisites, function( init_prereq ) { if ( init_prereq === prereq[ 0 ] ) { return init_prereq; } }).length === 0 ) {
					changes = changes + "<br /> • Add prerequsite: " + prereq[ 0 ];
				}
			});
			newModel[ ex.n ].exercise_model.prerequisites = jQuery.map( ex.incoming, function( prereq ) { return prereq[ 0 ] } );
			newModel[ ex.n ].exercise_model.covers = ex.covers;
			if ( changes !== "" ) {
				jQuery( "<p>" ).html( ex.display_name + changes ).appendTo( changeList );
			}
		});

		exportTab.empty();
		jQuery( "<textarea>" ).css({ width: "100%", height: "100%" }).text( JSON.stringify( newModel ) ).appendTo( exportTab );
		changeWindow.dialog( "open" );
		return false;
	});

});

function addPrereq() {
	addPath( jQuery( "#add-prereq" ).val(), selected[ 0 ] );
	updateForm( selected[ 0 ] );
	jQuery( "#add-prereq" ).val( 0 );
}

function deletePrereq( prereq ) {
	delPath( prereq, selected[ 0 ] );
	updateForm( selected[ 0 ] );
}

function addCover() {
	exercise[ selected[ 0 ] ].covers.push( jQuery( "#add-cover" ).val() );
	updateForm( selected[ 0 ] );
	jQuery( "#add-cover" ).val( 0 );
}

function deleteCover( cover ) {
	exercise[ selected[ 0 ] ].covers = jQuery.map( exercise[ selected[ 0 ] ].covers, function( c ) { if ( c !== cover ) return c; } );
	updateForm( selected[ 0 ] );
}
