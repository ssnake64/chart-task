//import './App.css'
import StockChart from "./components/stock-chart"

function App() {

  return (
    <main className='w-screen min-h-screen flex flex-col items-center p-4 justify-center overflow-scroll'>
      <h1 className="text-2xl sm:text-4xl md:text-6xl my-8">Stock Candlestick Chart</h1>
      <StockChart />
    </main>
  )
}

export default App
