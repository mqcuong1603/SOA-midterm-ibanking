import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Student = sequelize.define(
  "Student",
  {
    student_id: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      allowNull: false,
    },
    full_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    tuition_amount: {
      type: DataTypes.DECIMAL(18, 0),
      allowNull: false,
    },
    is_paid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "students",
    timestamps: false,
  }
);

export default Student;
