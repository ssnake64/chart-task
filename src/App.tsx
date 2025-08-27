//import './App.css'
import StockChart from "./components/stock-chart"

function App() {

  return (
    <main className='h-screen w-screen bg-[#1A1B1E] flex items-center justify-center'>
      <div className="w-10/12 mt-5">
      <h1>Stock Candlestick Chart</h1>
      <StockChart />
      </div>
    </main>
  )
}

export default App
