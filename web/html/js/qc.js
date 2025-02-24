function logQC(type, val, context) {
    return;
    $.post( "include/qc.php",{type:type,val:val, context:context}, function( data ) {
    });
}