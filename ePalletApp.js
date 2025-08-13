import React, { useState, useRef } from 'react';

// Component để hiển thị một thông báo
const MessageBox = ({ message, onClose }) => (
  <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-2xl p-6 text-center max-w-sm w-full">
      {/* Sử dụng pre-wrap để hiển thị xuống dòng và thêm thanh cuộn */}
      <div className="text-lg font-semibold text-gray-800 mb-4 whitespace-pre-wrap max-h-64 overflow-y-auto">
        {message}
      </div>
      <button
        onClick={onClose}
        className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-full hover:bg-indigo-700 transition duration-300 transform hover:scale-105"
      >
        Đóng
      </button>
    </div>
  </div>
);

// Component chính của ứng dụng
function App() {
  // State for the main application flow
  const [step, setStep] = useState(1);
  const [barcode, setBarcode] = useState('');
  const [palletId, setPalletId] = useState('');
  const [rackId, setRackId] = useState('');
  const [initialQty, setInitialQty] = useState('');
  const [image, setImage] = useState(null);
  const [action, setAction] = useState(null);
  const [db, setDb] = useState(['PALLET001', 'PALLET002']); // Mock database for pallet IDs
  const [message, setMessage] = useState('');
  
  // State for the IN process
  const [isWashing, setIsWashing] = useState(false);
  const [isWashed, setIsWashed] = useState(false);
  const [washBarcode, setWashBarcode] = useState('');
  const [washQty, setWashQty] = useState('');
  const [postWashStatus, setPostWashStatus] = useState(null);
  const [noGoodReason, setNoGoodReason] = useState('');
  const [isSavingToRack, setIsSavingToRack] = useState(false);
  const [palletToSave, setPalletToSave] = useState('');
  const [rackPosition, setRackPosition] = useState('');
  
  // State for the OUT process
  const [isOutAction, setIsOutAction] = useState(false);
  const [outActionType, setOutActionType] = useState(null); // 'Production', 'Sua', 'Scrap'
  const [palletToOut, setPalletToOut] = useState('');
  const [outRackPosition, setOutRackPosition] = useState('');
  const [outQty, setOutQty] = useState('');
  const [currentPalletQty, setCurrentPalletQty] = useState(0);
  const [palletInitialQty, setPalletInitialQty] = useState(0);
  const [remainingQty, setRemainingQty] = useState(0);

  const [palletHistory, setPalletHistory] = useState([
    { palletId: 'PALLET001', rackId: 'A-01-01', status: 'new register', qty: 50, timestamp: new Date().toLocaleString() },
    { palletId: 'PALLET002', rackId: 'A-01-02', status: 'new register', qty: 50, timestamp: new Date().toLocaleString() },
  ]);
  
  const [mockPalletData, setMockPalletData] = useState({
    'PALLET001': { rack: 'A-01-01', initialQty: 50, currentQty: 45 },
    'PALLET002': { rack: 'A-01-02', initialQty: 50, currentQty: 50 },
  });
  
  // Ref to the hidden file input element for CSV import
  const fileInputRef = useRef(null);

  // Handles the initial barcode scan
  const handleBarcodeScan = () => {
    if (db.includes(barcode)) {
      setMessage('Mã vạch đã tồn tại!');
      setStep(3); // Go to action selection
    } else {
      setMessage('Mã vạch không tồn tại, vui lòng nhập thông tin mới.');
      setStep(2); // Go to new pallet info
    }
  };

  // Handles submitting new pallet info
  const handleNewPalletSubmit = (e) => {
    e.preventDefault();
    const newQty = parseInt(initialQty, 10);
    if (palletId && rackId && !isNaN(newQty) && newQty > 0) {
      setDb([...db, palletId]);
      setMockPalletData(prevData => ({ ...prevData, [palletId]: { rack: rackId, initialQty: newQty, currentQty: newQty } }));
      setMessage('Thông tin pallet mới đã được lưu thành công.');
      setStep(3);
      const newHistoryEntry = {
          palletId: palletId,
          rackId: rackId,
          status: 'new register',
          qty: newQty,
          timestamp: new Date().toLocaleString()
      };
      setPalletHistory(prevHistory => [...prevHistory, newHistoryEntry]);
    } else {
      setMessage('Vui lòng nhập đầy đủ thông tin và số lượng ban đầu hợp lệ.');
    }
  };
  
  // Handles the file import action
  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        const lines = content.split('\n').filter(line => line.trim() !== ''); // Filter out empty lines
        
        // Tạo một mảng để lưu tất cả các thông báo
        const importMessages = [];
        
        // Kiểm tra xem file có rỗng không
        if (lines.length === 0) {
            setMessage('File rỗng. Không có dữ liệu để nhập.');
            return;
        }

        // Assuming the first line is the header
        const header = lines[0].split(',').map(h => h.trim());
        // Cập nhật tiêu đề dự kiến để khớp với file đã tạo
        const expectedHeader = ['Pallet ID', 'Rack ID', 'Qty'];

        if (JSON.stringify(header) !== JSON.stringify(expectedHeader)) {
            setMessage('Định dạng file không hợp lệ. Vui lòng sử dụng file có 3 cột: Pallet ID, Rack ID, Qty');
            return;
        }

        const newPallets = [];
        const newDbEntries = [...db];
        const updatedMockPalletData = { ...mockPalletData };
        const newHistoryEntries = [];

        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',').map(item => item.trim());
            const [palletId, rackId, qtyString] = row;
            const newQty = parseInt(qtyString, 10);

            if (palletId && rackId && !isNaN(newQty) && newQty > 0) {
                // Check for duplicate pallet ID
                if (!newDbEntries.includes(palletId)) {
                    newPallets.push({ palletId, rackId, newQty });
                    newDbEntries.push(palletId);
                    updatedMockPalletData[palletId] = { rack: rackId, initialQty: newQty, currentQty: newQty };
                    newHistoryEntries.push({
                        palletId: palletId,
                        rackId: rackId,
                        status: 'new register (imported)',
                        qty: newQty,
                        timestamp: new Date().toLocaleString()
                    });
                } else {
                    importMessages.push(`Cảnh báo: Pallet ID "${palletId}" đã tồn tại. Dòng này sẽ bị bỏ qua.`);
                }
            } else {
                importMessages.push(`Lỗi: Dữ liệu không hợp lệ tại dòng ${i + 1}. Dòng này sẽ bị bỏ qua.`);
            }
        }
        
        // Cập nhật state sau khi xử lý tất cả các dòng
        setDb(newDbEntries);
        setMockPalletData(updatedMockPalletData);
        setPalletHistory(prevHistory => [...prevHistory, ...newHistoryEntries]);
        
        // Tổng hợp và hiển thị thông báo cuối cùng
        let finalMessage = '';
        if (newPallets.length > 0) {
            finalMessage += `Đã nhập thành công ${newPallets.length} pallet mới từ file.`;
        }

        if (importMessages.length > 0) {
            if (finalMessage !== '') {
                finalMessage += '\n\n';
            }
            finalMessage += importMessages.join('\n');
        }

        if (finalMessage === '') {
            finalMessage = 'Không có pallet mới nào được nhập. Vui lòng kiểm tra lại file của bạn.';
        }
        
        setMessage(finalMessage);
        
        // Reset về bước 1 sau khi nhập file
        setStep(1);
        setBarcode(''); 
      };
      reader.readAsText(file);
    }
  };

  // Handles selecting an action (IN/OUT)
  const handleActionSelect = (selectedAction) => {
    setAction(selectedAction);
    setIsWashing(false);
    setIsWashed(false);
    setPostWashStatus(null);
    setIsSavingToRack(false);
    setIsOutAction(false); // Reset OUT state when a new action is selected
    setOutActionType(null);
    if (selectedAction === 'IN') {
      setMessage('Đã chọn hành động IN. Bắt đầu quá trình rửa pallet.');
    } else if (selectedAction === 'OUT') {
      setMessage('Đã chọn hành động OUT. Vui lòng chọn mục đích sử dụng.');
    }
  };

  // Handles starting the washing process
  const handleWashClick = () => {
    setIsWashing(true);
    setMessage('Vui lòng nhập thông tin rửa pallet.');
  };

  // Handles saving washing info
  const handleWashSave = () => {
    const washedQty = parseInt(washQty, 10);
    if (washBarcode && !isNaN(washedQty) && washedQty > 0) {
      const palletData = mockPalletData[washBarcode];
      if (palletData) {
        const newQty = palletData.currentQty + washedQty;
        if (newQty > palletData.initialQty) {
          setMessage(`Số lượng pallet sau khi thêm vượt quá số lượng ban đầu (${palletData.initialQty}). Không thể thêm.`);
          return;
        }
        // Update the current quantity in the mock database
        setMockPalletData(prevData => ({
          ...prevData,
          [washBarcode]: {
            ...prevData[washBarcode],
            currentQty: newQty
          }
        }));
        setMessage(`Đã lưu thông tin rửa: Barcode ID ${washBarcode}, Số lượng ${washedQty}.`);
        setIsWashing(false);
        setIsWashed(true);

        // Add in-wash action to history with washed quantity
        const newHistoryEntry = {
            palletId: washBarcode,
            rackId: palletData.rack,
            status: 'in-wash',
            qty: washedQty,
            timestamp: new Date().toLocaleString()
        };
        setPalletHistory(prevHistory => [...prevHistory, newHistoryEntry]);
      } else {
        setMessage('Không tìm thấy Pallet ID này trong hệ thống.');
      }
    } else {
      setMessage('Vui lòng nhập đủ thông tin Barcode và Số lượng hợp lệ.');
    }
  };

  // Handles starting the post-wash check
  const handlePostWashCheck = () => {
    setPostWashStatus('checking');
  };

  // Handles selecting 'Good' after post-wash check
  const handleGoodSelect = () => {
    setPostWashStatus('good');
    setMessage('Pallet đã được kiểm tra và đánh dấu là Good.');
  };

  // Handles selecting 'NoGood'
  const handleNoGoodSelect = () => {
    setPostWashStatus('noGood');
  };

  // Handles saving the reason for 'NoGood'
  const handleSaveNoGoodReason = () => {
    if (noGoodReason) {
      const newMessage = `Pallet được đánh dấu là NoGood với lý do: "${noGoodReason}".\n\nVui lòng báo cho quản lý biết về tình trạng pallet này!`;
      setMessage(newMessage);
      setPostWashStatus(null);
      setNoGoodReason('');
    } else {
      setMessage('Vui lòng nhập lý do.');
    }
  };
  
  // Handles starting the "Save to rack" process
  const handleSaveToRackClick = () => {
    setIsSavingToRack(true);
    setMessage('Vui lòng scan Pallet ID để lưu vào rack.');
    setPalletToSave('');
    setRackPosition('');
  };

  // Handles scanning Pallet ID for saving to rack
  const handlePalletToSaveChange = (e) => {
    const scannedPalletId = e.target.value.toUpperCase();
    setPalletToSave(scannedPalletId);
    
    const palletData = mockPalletData[scannedPalletId];
    if (palletData) {
      setRackPosition(palletData.rack);
    } else {
      setRackPosition('Không tìm thấy vị trí rack.');
    }
  };

  // Handles the final save to rack action
  const handleFinalSaveToRack = () => {
    if (palletToSave && rackPosition && rackPosition !== 'Không tìm thấy vị trí rack.') {
      setMessage(`Đã lưu Pallet ID ${palletToSave} vào Rack ID ${rackPosition}.`);
      setIsSavingToRack(false);
      // Add in-rack action to history with current quantity
      const newHistoryEntry = {
          palletId: palletToSave,
          rackId: rackPosition,
          status: 'in-rack',
          qty: mockPalletData[palletToSave].currentQty,
          timestamp: new Date().toLocaleString()
      };
      setPalletHistory(prevHistory => [...prevHistory, newHistoryEntry]);
    } else {
      setMessage('Vui lòng scan Pallet ID hợp lệ.');
    }
  };

  // Handles selecting a specific OUT action (Production, Sua, Scrap)
  const handleOutActionSelect = (actionType) => {
    setIsOutAction(true);
    setOutActionType(actionType);
    setMessage(`Đã chọn Pallet OUT cho ${actionType}.`);
    setPalletToOut('');
    setOutRackPosition('');
    setOutQty('');
    setCurrentPalletQty(0);
    setPalletInitialQty(0);
    setRemainingQty(0);
  };
  
  // Handles scanning Pallet ID for OUT
  const handleOutScan = (e) => {
    const scannedPalletId = e.target.value.toUpperCase();
    setPalletToOut(scannedPalletId);
    
    const palletData = mockPalletData[scannedPalletId];
    if (palletData) {
      setOutRackPosition(palletData.rack);
      setCurrentPalletQty(palletData.currentQty);
      setPalletInitialQty(palletData.initialQty);
      setRemainingQty(palletData.currentQty);
    } else {
      setOutRackPosition('Không tìm thấy vị trí rack.');
      setCurrentPalletQty(0);
      setPalletInitialQty(0);
      setRemainingQty(0);
    }
  };

  // Handles calculating remaining quantity
  const handleOutQtyChange = (e) => {
    const qty = parseInt(e.target.value, 10);
    if (!isNaN(qty) && qty >= 0 && qty <= currentPalletQty) {
      setOutQty(qty);
      setRemainingQty(currentPalletQty - qty);
    } else {
      setOutQty(e.target.value);
      setRemainingQty(currentPalletQty);
    }
  };

  // Handles saving the OUT action
  const handleOutSave = () => {
    const outQuantity = parseInt(outQty, 10);
    if (palletToOut && !isNaN(outQuantity) && outQuantity > 0 && outRackPosition !== 'Không tìm thấy vị trí rack.') {
      if (outQuantity > currentPalletQty) {
        setMessage('Số lượng OUT không thể lớn hơn số lượng hiện có.');
        return;
      }
      // Update the current quantity in the mock database
      setMockPalletData(prevData => ({
        ...prevData,
        [palletToOut]: {
          ...prevData[palletToOut],
          currentQty: remainingQty
        }
      }));
      setMessage(`Đã xuất ${outQuantity} pallet cho ${outActionType}. Còn lại ${remainingQty} pallet.`);
      setIsOutAction(false);
      setOutActionType(null);
      // Add out action to history with the quantity that was moved
      const newHistoryEntry = {
          palletId: palletToOut,
          rackId: outRackPosition,
          status: `out ${outActionType.toLowerCase()}`,
          qty: outQuantity,
          timestamp: new Date().toLocaleString()
      };
      setPalletHistory(prevHistory => [...prevHistory, newHistoryEntry]);
    } else {
      setMessage('Vui lòng scan Pallet ID và nhập số lượng hợp lệ.');
    }
  };

  // Function to close the message box
  const handleCloseMessage = () => {
    setMessage('');
  };

  // Function to export the pallet history to a CSV file
  const handleExport = () => {
    if (palletHistory.length === 0) {
      setMessage('Không có dữ liệu để xuất.');
      return;
    }
    const header = "PalletID,RackID,Status,Qty,Timestamp";
    const csvContent = palletHistory.map(item => `${item.palletId},${item.rackId},"${item.status}",${item.qty},"${item.timestamp}"`).join("\n");
    const blob = new Blob([header + "\n" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "ePallet_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Reset the app to its initial state
  const resetApp = () => {
    setStep(1);
    setBarcode('');
    setWashBarcode('');
    setWashQty('');
    setPalletId('');
    setRackId('');
    setInitialQty('');
    setImage(null);
    setAction(null);
    setMessage('Ứng dụng đã được reset. Bắt đầu lại!');
    setIsWashing(false);
    setIsWashed(false);
    setPostWashStatus(null);
    setNoGoodReason('');
    setIsSavingToRack(false);
    setPalletToSave('');
    setRackPosition('');
    setIsOutAction(false);
    setOutActionType(null);
    setPalletToOut('');
    setOutRackPosition('');
    setOutQty('');
    setCurrentPalletQty(0);
    setPalletInitialQty(0);
    setRemainingQty(0);
    setPalletHistory([]);
    setMockPalletData({
        'PALLET001': { rack: 'A-01-01', initialQty: 50, currentQty: 45 },
        'PALLET002': { rack: 'A-01-02', initialQty: 50, currentQty: 50 },
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {message && <MessageBox message={message} onClose={handleCloseMessage} />}
      
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-lg w-full transform transition-all duration-300 hover:scale-105">
        <h1 className="text-3xl font-bold text-center text-indigo-700 mb-6">Ứng dụng ePallet</h1>
        
        {/* Step 1: Quét mã vạch */}
        {step === 1 && (
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">1. Quét mã vạch Pallet</h2>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Nhập mã vạch pallet..."
              className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300"
            />
            <button
              onClick={handleBarcodeScan}
              className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg shadow-lg hover:bg-indigo-700 transition duration-300 transform hover:scale-105"
            >
              Quét
            </button>
          </div>
        )}

        {/* Step 2: Nhập thông tin Pallet mới */}
        {step === 2 && (
          <form onSubmit={handleNewPalletSubmit} className="flex flex-col items-center">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">2. Nhập thông tin Pallet mới</h2>
            
            <input
              type="text"
              value={palletId}
              onChange={(e) => setPalletId(e.target.value)}
              placeholder="Nhập Pallet ID..."
              className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300"
            />
            
            <input
              type="text"
              value={rackId}
              onChange={(e) => setRackId(e.target.value)}
              placeholder="Nhập Rack ID..."
              className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300"
            />

            <input
              type="number"
              value={initialQty}
              onChange={(e) => setInitialQty(e.target.value)}
              placeholder="Nhập số lượng ban đầu..."
              className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300"
            />
            
            <label className="w-full text-left mb-2 text-gray-700 font-medium">Ảnh thực tế:</label>
            <input
              type="file"
              onChange={(e) => setImage(e.target.files[0])}
              className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300"
            />
            
            <div className="flex w-full space-x-2">
                <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white font-bold py-3 rounded-lg shadow-lg hover:bg-green-700 transition duration-300 transform hover:scale-105"
                >
                    Lưu vào DB
                </button>
                <button
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    className="flex-1 bg-gray-600 text-white font-bold py-3 rounded-lg shadow-lg hover:bg-gray-700 transition duration-300 transform hover:scale-105"
                >
                    Nhập file
                </button>
            </div>
            {/* Nút Kết thúc và bắt đầu lại mới được thêm vào */}
            <button
                type="button"
                onClick={resetApp}
                className="mt-4 w-full bg-red-600 text-white font-bold py-3 rounded-lg shadow-lg hover:bg-red-700 transition duration-300 transform hover:scale-105"
            >
                Kết thúc và bắt đầu lại
            </button>
          </form>
        )}
        
        {/* Thêm input file ẩn cho chức năng Nhập file */}
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            className="hidden"
            accept=".csv"
        />

        {/* Step 3: Chọn hành động IN / OUT */}
        {step === 3 && (
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">3. Chọn hành động IN / OUT</h2>
            <div className="flex space-x-4 w-full">
              <button
                onClick={() => handleActionSelect('IN')}
                className="flex-1 bg-sky-600 text-white font-bold py-3 rounded-lg shadow-lg hover:bg-sky-700 transition duration-300 transform hover:scale-105"
              >
                IN
              </button>
              <button
                onClick={() => handleActionSelect('OUT')}
                className="flex-1 bg-orange-600 text-white font-bold py-3 rounded-lg shadow-lg hover:bg-orange-700 transition duration-300 transform hover:scale-105"
              >
                OUT
              </button>
            </div>
            
            {/* Hiển thị các bước tiếp theo của IN */}
            {action === 'IN' && (
                <div className="mt-4 p-4 border border-gray-200 rounded-lg w-full">
                    <h3 className="font-semibold text-gray-700 mb-2">Quá trình IN</h3>
                    
                    {!isWashing && !isWashed && !isSavingToRack && (
                        <button 
                            onClick={handleWashClick}
                            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition duration-300 mb-2"
                        >
                            Rửa pallet
                        </button>
                    )}

                    {isWashing && (
                      <div className="mt-2 p-2 border border-blue-300 rounded-lg bg-blue-50">
                        <h4 className="font-medium mb-2 text-blue-700">Nhập thông tin rửa:</h4>
                        <input
                          type="text"
                          value={washBarcode}
                          onChange={(e) => setWashBarcode(e.target.value)}
                          placeholder="Barcode Pallet ID..."
                          className="w-full p-2 mb-2 border rounded-lg"
                        />
                        <input
                          type="number"
                          value={washQty}
                          onChange={(e) => setWashQty(e.target.value)}
                          placeholder="Số lượng (Qty)..."
                          className="w-full p-2 mb-2 border rounded-lg"
                        />
                        <button
                          onClick={handleWashSave}
                          className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition duration-300"
                        >
                          Lưu
                        </button>
                      </div>
                    )}
                    
                    {isWashed && !isSavingToRack && (
                        <button 
                            onClick={handlePostWashCheck}
                            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition duration-300 mb-2"
                        >
                            Kiểm tra sau rửa
                        </button>
                    )}

                    {postWashStatus === 'checking' && (
                      <div className="mt-4 flex space-x-2">
                        <button
                          onClick={handleGoodSelect}
                          className="flex-1 bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition duration-300"
                        >
                          Good
                        </button>
                        <button
                          onClick={handleNoGoodSelect}
                          className="flex-1 bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition duration-300"
                        >
                          NoGood
                        </button>
                      </div>
                    )}

                    {postWashStatus === 'noGood' && (
                      <div className="mt-4 w-full">
                        <label className="text-gray-700 font-medium">Lý do:</label>
                        <textarea
                          value={noGoodReason}
                          onChange={(e) => setNoGoodReason(e.target.value)}
                          placeholder="Nhập lý do tại đây..."
                          className="w-full p-2 mt-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-300"
                          rows="3"
                        />
                        <button
                          onClick={handleSaveNoGoodReason}
                          className="mt-2 w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition duration-300"
                        >
                          Lưu
                        </button>
                      </div>
                    )}

                    {(postWashStatus === 'good' || (postWashStatus === 'noGood' && noGoodReason)) && !isSavingToRack && (
                        <button 
                            onClick={handleSaveToRackClick}
                            className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition duration-300 mt-2"
                        >
                            Lưu vào rack
                        </button>
                    )}
                    
                    {isSavingToRack && (
                      <div className="mt-4 p-4 border border-gray-200 rounded-lg w-full bg-green-50">
                        <h4 className="font-medium mb-2 text-green-700">Lưu vào rack</h4>
                        <input
                          type="text"
                          value={palletToSave}
                          onChange={handlePalletToSaveChange}
                          placeholder="Scan Pallet ID..."
                          className="w-full p-2 mb-2 border rounded-lg"
                        />
                        <div className="p-2 mb-2 bg-gray-200 rounded-lg text-gray-800 font-semibold">
                          Vị trí Rack: <span className="font-normal">{rackPosition || 'Chưa có dữ liệu'}</span>
                        </div>
                        <button
                          onClick={handleFinalSaveToRack}
                          className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition duration-300"
                        >
                          Hoàn tất lưu
                        </button>
                      </div>
                    )}
                </div>
            )}

            {/* Hiển thị các bước tiếp theo của OUT */}
            {action === 'OUT' && (
                <div className="mt-4 p-4 border border-gray-200 rounded-lg w-full">
                    <h3 className="font-semibold text-gray-700 mb-2">Pallet OUT dùng để?</h3>
                    
                    {/* Hiển thị các nút chọn hành động OUT ban đầu */}
                    {!isOutAction && (
                        <div className="flex space-x-2">
                            <button
                                onClick={() => handleOutActionSelect('Production')}
                                className="flex-1 bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition duration-300"
                            >
                                Production
                            </button>
                            <button
                                onClick={() => handleOutActionSelect('Sửa')}
                                className="flex-1 bg-yellow-500 text-white py-2 rounded-md hover:bg-yellow-600 transition duration-300"
                            >
                                Sửa
                            </button>
                            <button
                                onClick={() => handleOutActionSelect('Scrap')}
                                className="flex-1 bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition duration-300"
                            >
                                Scrap
                            </button>
                        </div>
                    )}
                    
                    {/* Giao diện nhập thông tin OUT */}
                    {isOutAction && (
                      <div className="mt-4 p-4 border border-gray-300 rounded-lg w-full bg-orange-50">
                        <h4 className="font-medium mb-2 text-orange-700">Xuất pallet cho: {outActionType}</h4>
                        <input
                          type="text"
                          value={palletToOut}
                          onChange={handleOutScan}
                          placeholder="Scan Pallet ID..."
                          className="w-full p-2 mb-2 border rounded-lg"
                        />
                        <div className="p-2 mb-2 bg-gray-200 rounded-lg text-gray-800 font-semibold">
                          Vị trí Rack: <span className="font-normal">{outRackPosition || 'Chưa có dữ liệu'}</span>
                        </div>
                        <div className="p-2 mb-2 bg-gray-200 rounded-lg text-gray-800 font-semibold">
                          Số lượng ban đầu: <span className="font-normal">{palletInitialQty}</span>
                        </div>
                        <div className="p-2 mb-2 bg-gray-200 rounded-lg text-gray-800 font-semibold">
                          Số lượng hiện có: <span className="font-normal">{currentPalletQty}</span>
                        </div>
                        <input
                          type="number"
                          value={outQty}
                          onChange={handleOutQtyChange}
                          placeholder="Nhập số lượng OUT..."
                          className="w-full p-2 mb-2 border rounded-lg"
                        />
                        <div className="p-2 mb-2 bg-gray-200 rounded-lg text-gray-800 font-semibold">
                          Số lượng còn lại: <span className="font-normal">{remainingQty}</span>
                        </div>
                        <button
                          onClick={handleOutSave}
                          className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition duration-300"
                        >
                          Lưu
                        </button>
                      </div>
                    )}
                </div>
            )}
            
            {/* Nút export file mới được thêm vào */}
            {(action === 'IN' || action === 'OUT') && (
                <button
                  onClick={handleExport}
                  className="mt-4 w-full bg-purple-600 text-white font-bold py-3 rounded-lg shadow-lg hover:bg-purple-700 transition duration-300 transform hover:scale-105"
                >
                  Export file
                </button>
            )}

            <button
              onClick={resetApp}
              className="mt-6 w-full bg-gray-500 text-white font-bold py-3 rounded-lg shadow-lg hover:bg-gray-600 transition duration-300 transform hover:scale-105"
            >
              Kết thúc và bắt đầu lại
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
