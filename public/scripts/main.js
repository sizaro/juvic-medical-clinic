const lineHumburger = document.querySelector(".line-humburger") 
const navigation = document.querySelector(".navigation") 
const xHumburger = document.querySelector(".x-humburger") 

lineHumburger.addEventListener("click", ()=>{
    navigation.classList.add("active")
})

xHumburger.addEventListener("click", ()=>{
    navigation.classList.remove("active")
})