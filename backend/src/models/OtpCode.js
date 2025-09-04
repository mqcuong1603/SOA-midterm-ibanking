import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const OtpCode = sequelize.define(
  "OtpCode",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    transaction_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "transactions",
        key: "id",
      },
    },
    otp_code: {
      type: DataTypes.STRING(6),
      allowNull: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    is_used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "otp_codes",
    timestamps: false,
  }
);

export default OtpCode;
