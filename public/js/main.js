function dateFormat(date){
    return date.getFullYear() + '/' + ('0' + (date.getMonth() + 1)).slice(-2) + '/' + ('0' + date.getDay()).slice(-2);
}
function firstDate(date){
    return date.getFullYear() + '/' + ('0' + (date.getMonth() + 1)).slice(-2) + '/01';
}
