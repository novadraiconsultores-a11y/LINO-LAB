import { QRCodeSVG } from 'qrcode.react'
import Barcode from 'react-barcode'

export default function ProductLabel({ product }) {
    if (!product) return null

    // Fallbacks
    const name = product.nombre_producto || 'Sin Nombre'
    const price = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(product.precio_venta || 0)
    const sku = product.sku_producto || '---'

    // Barcode MUST be a string. If empty, use '0000000000000' to show placeholder structure or just return null
    const ean13 = product.codigo_barras && product.codigo_barras.length === 13
        ? product.codigo_barras
        : '0000000000000'

    return (
        <div className="bg-white text-black p-4 rounded-lg shadow-lg max-w-sm mx-auto border border-gray-200">
            {/* Header: Name & Price */}
            <div className="flex justify-between items-start mb-2 border-b-2 border-black pb-2">
                <h3 className="text-sm font-bold leading-tight uppercase max-h-10 overflow-hidden text-ellipsis w-[65%]">
                    {name}
                </h3>
                <div className="text-xl font-black">
                    {price}
                </div>
            </div>

            {/* Content: QR and Barcode */}
            <div className="flex items-center justify-between gap-2">
                {/* QR Code */}
                <div className="flex flex-col items-center">
                    <QRCodeSVG
                        value={sku}
                        size={80}
                        level="M"
                        includeMargin={false}
                    />
                    <span className="text-[10px] font-mono font-bold mt-1 text-center">
                        {sku}
                    </span>
                </div>

                {/* EAN-13 Barcode */}
                <div className="flex flex-col items-center flex-1">
                    <div className="scale-90 origin-right">
                        <Barcode
                            value={ean13}
                            format="EAN13"
                            width={1.5}
                            height={40}
                            fontSize={12}
                            background="#ffffff"
                            lineColor="#000000"
                            margin={0}
                        />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="text-[10px] text-center mt-2 border-t border-gray-300 pt-1 font-semibold uppercase">
                Etiqueta de Producto
            </div>
        </div>
    )
}
