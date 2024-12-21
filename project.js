const express = require('express')
const fs = require('node:fs')
const path = require('node:path')
const app = express()
require('dotenv').config()

const PORT = process.env.PORT
const usersFilePath = path.resolve(__dirname, 'users.json')
const productsFilePath = path.resolve(__dirname, 'products.json')
const ordersFilePath = path.resolve(__dirname, 'orders.json')

const getData = (filePath) => {
    try {
        return fs.readFileSync(filePath, 'utf-8')
    }catch (err) {
        return []
    }
}

const setData = (filePath, data) => {
    return fs.writeFileSync(filePath, JSON.stringify(data), null, 2)
}

const areEqual = (obj1, obj2) => {
    let keys1 = Object.keys(obj1)

    for(const key of keys1) {
        if(obj1[key] !== obj2[key]) {
            return false
        }
    }

    return true
}

const totalCountGenerator = (orderProducts, products) => {
    let totalCount = 0

    for(let i = 0; i < orderProducts.length; ++i) {
        for(let j = 0; j < products.length; ++j) {
            if(orderProducts[i] === products[j].name) {
                totalCount += Number(products[j].price)
                break
            }
        }
    }

    return totalCount
}

const validationData = (req, res, next) => {
    const body = req.body
    const {name, email, password, is_admin} = body

    if(!name?.trim() || !password?.trim() ||  !email?.trim()) {
        return res.status(404).json({message: 'All fields must be filled in'})
    }

    if(name.length < 3) {
        return res.status(404).json({message: 'The name must have at least three letters'})
    }

    if(password.length < 6) {
        return res.status(404).json({message: 'The name must have at least six letters'})
    }

    if(JSON.parse(getData(usersFilePath)).some(user => user.email == email)) {
        return res.status(404).json({message: 'The email address must be unique'})
    }

    req.body = {name, email, is_admin}
    next()
}

const restrictAccess = (req, res, next) => {
    const users = JSON.parse(getData(usersFilePath, 'utf-8'))
    const product = req.body
    const {name} = product

    for(let i = 0; i < users.length; ++i) {
        const user = users[i]
        if(name == user.name && user.is_admin == true) {
            next()
        } 
    }

    res.status(404).json({message: 'Access is restricted to admins only'})
}

const logRequests = (req, res, next) => {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}], method: ${req.method}, URL: ${req.url}`)
    next()
}

const InputSanitizationUser = (req, res, next) => {
    const user = req.body
    let {name, email, password, is_admin = false} = user

    req.body = {name: name.trim(), email: email.toLowerCase().trim(), password: password.trim(), is_admin}
    next()

}

const middlware1 = (req, res, next) => {
    const order = req.body
    const properties = Object.keys(order)
    let check = false

    for(const key of properties) {
        if(key === 'user_id') {
            check = true
        }
    }

    if(!check) {
        return res.status(404).json({message: 'The order does not have a user ID'})
    }
    
    next()
}

const middlware2 = (req, res, next) => {
    const users = JSON.parse(getData(usersFilePath, 'utf-8'))
    const order = req.body

    const result = users.some(user => user.id == order.user_id)

    if(!result) {
        return res.status(404).json({message: "User not a found"})
    }

    next()
}

app.use(express.json())
app.use(logRequests)
app.post('/users/register', InputSanitizationUser, validationData, (req, res) => {
    const users = JSON.parse(getData(usersFilePath, 'utf-8'))

    let user = req.body

    user = {...user, id: Date.now()}

    users.push(user)
    setData(usersFilePath, users)

    res.send(user)
})

app.post('/users/login', (req, res) => {
    const users = JSON.parse(getData(usersFilePath, 'utf-8'))
    const body = req.body

    if(!body.is_admin) {
        body.is_admin = false
    }

    if(users.some(elm => areEqual(elm, body))){
        return res.status(200).json({message: 'login is succesful'})
    }

    res.status(404).send({message: "user not found"})
})

app.post('/products', restrictAccess, (req, res) => {
    const products = JSON.parse(getData(productsFilePath, 'utf-8'))
    const body = req.body
    const {name, description, price, category, image_url, is_active} = body

    if(!name.trim() || !description.trim() || !category.trim() || !image_url.trim()) {
        return res.status(404).json({message: 'All fields must be filled in'})
    }

    if(price <= 0) {
        return res.status(400).json({message: 'price must be greater than zero'})
    }

    const product = {
        ...body,
        is_active: is_active ?? true
    }

    products.push(product)
    setData(productsFilePath, products)

    res.status(200).send(product)
})

app.get('/products', (req, res) => {
    const products = JSON.parse(getData(productsFilePath, 'utf-8'))

    res.status(200).send(products)
})

app.post('/orders', middlware1, middlware2, (req, res) => {
    const body = req.body
    const orders = JSON.parse(getData(ordersFilePath, 'utf-8'))
    const products = JSON.parse(getData(productsFilePath, 'utf-8'))


    if(body.products.length <= 0) {
        return res.status(404).json({message: 'Products do not have a valid quantity'})
    }

    const total_count = totalCountGenerator(body.products, products)

    const order = {
        ...body,
        total_count
    }

    orders.push(order)
    setData(ordersFilePath, orders)
    res.send(order)
})

app.get('/orders', (req, res) => {
    const orders = JSON.parse(getData(ordersFilePath, 'utf-8'))

    res.send(orders)
})

app.listen(PORT, () => {
    console.log('end')
})