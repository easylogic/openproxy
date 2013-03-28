$(function(){
	$(".list").chosen();
	$(".list-opt").chosen();
	$(".link").chosen();
	
	$(".lock-btn").click(function(e){
		if ($(this).hasClass('active')) {
			$(this).removeClass('active')
		} else {
			$(this).addClass('active')
		}
	})

	$(".start-btn").click(function(e){
		if ($(this).hasClass('active')) {
			$(this).removeClass('active')
		} else {
			$(this).addClass('active')
		}
	})	
	
})
