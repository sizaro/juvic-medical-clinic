const lineHumburger = document.querySelector(".line-humburger") 
const navigation = document.querySelector(".navigation") 

lineHumburger.addEventListener("click", ()=>{
    navigation.classList.toggle("active")
})