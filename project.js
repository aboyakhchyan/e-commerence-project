const express = require('express')
const fs = require('node:fs')
const path = require('node:path')
const app = express()

const PORT = 3001
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

app.use(express.json())
app.post('/users/register', (req, res) => {
    const users = JSON.parse(getData(usersFilePath, 'utf-8'))
    const body = req.body

    if(!body.is_admin) body.is_admin = false

    if(!body.name?.trim() || !body.password?.trim() ||  !body.email?.trim()) {
        res.status(404).send('All fields must be filled in')
    }

    if(body.name.length < 3) {
        res.status(404).send('The name must have at least three letters')
    }

    if(body.password.length < 6) {
        res.status(404).send('The name must have at least six letters')
    }

    if(JSON.parse(getData(usersFilePath)).some(user => user.email == body.email)) {
        res.status(404).send('The email address must be unique')
    }

    const user = {
        ...body,
        id: Date.now()
    }

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
        res.status(200).send({message: 'login is succesful'})
    }

    res.status(404).send({message: "user not found"})
})

app.post('/products', (req, res) => {
    const products = JSON.parse(getData(productsFilePath, 'utf-8'))
    const body = req.body
    const {name, description, price, category, image_url, is_active} = body

    if(!name.trim() || !description.trim() || !category.trim() || !image_url.trim()) {
        res.status(404).send({message: 'All fields must be filled in'})
    }

    if(price <= 0) {
        res.status(400).send({message: 'price must be greater than zero'})
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

app.post('/orders', (req, res) => {
    const body = req.body
    const orders = JSON.parse(getData(ordersFilePath, 'utf-8'))
    const products = JSON.parse(getData(productsFilePath, 'utf-8'))


    if(body.products.length <= 0) {
        res.status(404).send({message: 'Products do not have a valid quantity'})
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